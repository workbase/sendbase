"use server"

import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireUser } from "@/lib/auth/session"
import {
  countCharacters,
  countLinks,
  getPlatformCharacterLimit,
  hasXPremiumSetting,
  platformLimits,
} from "@/lib/platforms/limits"
import { createApiPlatformPublisher } from "@/lib/platforms/publish"
import {
  queryTikTokCreatorInfo,
  TikTokApiError,
} from "@/lib/platforms/tiktok/client"
import {
  prepareTikTokPhotoImages,
  verifyTikTokPhotoImageUrls,
} from "@/lib/platforms/tiktok/images"
import { initializeTikTokPhotoPost } from "@/lib/platforms/tiktok/publish"
import {
  tiktokPhotoPublishOptionsSchema,
  validateTikTokPhotoPublishOptions,
  type TikTokPhotoPublishOptions,
} from "@/lib/platforms/tiktok/schema"
import {
  htmlToDiscordMarkdown,
  htmlToPlainText,
  htmlToPlainTextWithUrls,
  imageMetadataFromHtml,
  imageUrlsFromHtml,
  sanitizeEditorHtml,
} from "@/lib/posts/content"
import { mergeEditorHtml } from "@/lib/posts/editor-output"
import { optimizePostImage, preparePostHtmlForSoop } from "@/lib/posts/images"
import {
  isPostImageMimeType,
  POST_IMAGE_MAX_BYTES,
} from "@/lib/posts/image-constraints"
import { getPostDetail, getPostHistory } from "@/lib/posts/queries"
import { postFormSchema } from "@/lib/posts/schema"
import { createAdminClient } from "@/lib/supabase/admin"
import type {
  ApiPublishPlatform,
  ExtensionPublishJob,
  PublishDestinationResult,
  PublishPlatform,
  PublishPostActionResult,
  PublishResult,
} from "@/lib/types"

const historyCursorSchema = z.string().datetime({ offset: true }).optional()
const X_DAILY_POST_LIMIT_MESSAGE =
  "X에는 계정당 하루 최대 3개의 공지만 게시할 수 있습니다."
const PLATFORM_MAINTENANCE_MESSAGE =
  "현재 점검 중인 플랫폼이 포함되어 있습니다. 새로고침 후 다시 시도해 주세요."

type PersistPostResult =
  | { ok: false; error: string }
  | {
      ok: true
      postId: string
    }

type PreparedThreadReply = {
  html: string
  text: string
  imageUrls: string[]
}

const apiPlatformSchema = z.enum(["threads", "x", "discord", "tiktok"])
const extensionPlatformSchema = z.enum(["naver_cafe", "soop"])
const postIdSchema = z.string().uuid()

function prepareStoredThreadReplies(value: unknown): PreparedThreadReply[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return []
    const contentHtml = (item as Record<string, unknown>).contentHtml
    if (typeof contentHtml !== "string") return []
    const html = sanitizeEditorHtml(contentHtml)
    return [
      {
        html,
        text: htmlToPlainTextWithUrls(html),
        imageUrls: imageUrlsFromHtml(html),
      },
    ]
  })
}

export async function getOlderPostsAction(before?: string) {
  const user = await requireUser()
  const cursor = historyCursorSchema.parse(before)
  return getPostHistory(user.id, cursor)
}

export async function getPostDetailAction(postId: string) {
  const user = await requireUser()
  return getPostDetail(user.id, z.string().uuid().parse(postId))
}

export async function getTikTokCreatorInfoAction() {
  const user = await requireUser()
  const supabase = createAdminClient()
  const [creatorInfo, manualReviewResult] = await Promise.all([
    queryTikTokCreatorInfo(user.id),
    supabase
      .from("post_destinations")
      .select("id, posts!inner(user_id)")
      .eq("platform", "tiktok")
      .eq("requires_manual_review", true)
      .is("external_publish_id", null)
      .eq("posts.user_id", user.id)
      .limit(1),
  ])
  if (manualReviewResult.error)
    throw new Error(manualReviewResult.error.message)
  return {
    ...creatorInfo,
    requiresManualReview: (manualReviewResult.data?.length ?? 0) > 0,
  }
}

export async function acknowledgeTikTokManualReviewAction() {
  const user = await requireUser()
  const supabase = createAdminClient()
  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select("id")
    .eq("user_id", user.id)
  if (postsError) throw new Error(postsError.message)
  const postIds = (posts ?? []).map((post) => post.id)
  if (postIds.length === 0) return { ok: true }
  const { error } = await supabase
    .from("post_destinations")
    .update({
      requires_manual_review: false,
      updated_at: new Date().toISOString(),
    })
    .in("post_id", postIds)
    .eq("platform", "tiktok")
    .eq("status", "failed")
    .is("external_publish_id", null)
  if (error) throw new Error(error.message)
  return { ok: true }
}

function validateLimits(
  platforms: PublishPlatform[],
  text: string,
  discordContent: string,
  images: string[],
  contextLabel?: string,
  xPremium = false
) {
  const prefix = contextLabel ? `${contextLabel}: ` : ""
  for (const platform of platforms) {
    const limit = platformLimits[platform]
    const maxCharacters = getPlatformCharacterLimit(platform, xPremium)
    const platformText = platform === "discord" ? discordContent : text
    if (
      maxCharacters &&
      countCharacters(platform, platformText) > maxCharacters
    ) {
      throw new Error(
        `${prefix}${limit.label} 글자 수 제한(${maxCharacters}자)을 초과했습니다.`
      )
    }
    if (limit.maxImages && images.length > limit.maxImages) {
      throw new Error(
        `${prefix}${limit.label} 이미지 제한(${limit.maxImages}개)을 초과했습니다.`
      )
    }
    if (images.length < limit.minImages) {
      throw new Error(
        `${prefix}${limit.label}에는 이미지를 ${limit.minImages}개 이상 추가해 주세요.`
      )
    }
    if (limit.maxLinks && countLinks(text) > limit.maxLinks) {
      throw new Error(
        `${prefix}${limit.label} 링크 제한(${limit.maxLinks}개)을 초과했습니다.`
      )
    }
  }
}

async function persistPost(
  userId: string,
  input: z.infer<typeof postFormSchema>,
  threadReplies: PreparedThreadReply[],
  tiktokOptions: TikTokPhotoPublishOptions | null
): Promise<PersistPostResult> {
  const html = sanitizeEditorHtml(input.contentHtml)
  const text = [
    htmlToPlainText(html),
    ...threadReplies.map((reply) => htmlToPlainText(reply.html)),
  ]
    .filter(Boolean)
    .join("\n\n")
  const imageUrls = imageUrlsFromHtml(html)
  const imageMetadata = [
    ...imageMetadataFromHtml(html),
    ...threadReplies.flatMap((reply) => imageMetadataFromHtml(reply.html)),
  ]
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc("create_post_for_publishing", {
    p_user_id: userId,
    p_title: input.title,
    p_content_html: html,
    p_content_text: text,
    p_image_urls: imageUrls,
    p_image_metadata: imageMetadata,
    p_destinations: input.destinations,
    p_enforce_x_daily_limit: process.env.NODE_ENV === "production",
    p_thread_replies: threadReplies.map((reply) => ({
      contentHtml: reply.html,
    })),
    p_tiktok_publish_options: tiktokOptions,
  })
  if (error) {
    if (
      error.message === X_DAILY_POST_LIMIT_MESSAGE ||
      error.message === PLATFORM_MAINTENANCE_MESSAGE
    ) {
      return { ok: false, error: error.message }
    }
    throw new Error(`게시물을 저장하지 못했습니다: ${error.message}`)
  }

  const postId = data as string
  return { ok: true, postId }
}

export async function publishPostAction(
  input: unknown
): Promise<PublishPostActionResult> {
  const user = await requireUser()
  const parsed = postFormSchema.safeParse(input)
  if (!parsed.success)
    throw new Error(
      parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요."
    )
  const sanitized = sanitizeEditorHtml(parsed.data.contentHtml)
  const socialText = htmlToPlainTextWithUrls(sanitized)
  const discordText = htmlToDiscordMarkdown(sanitized)
  const discordContent = parsed.data.title
    ? `**${parsed.data.title}**\n\n${discordText}`
    : discordText
  const images = imageUrlsFromHtml(sanitized)
  if (!socialText && images.length === 0)
    throw new Error("본문 또는 이미지를 추가해 주세요.")
  const threadPlatforms = parsed.data.destinations.filter(
    (platform): platform is "threads" | "x" =>
      platform === "threads" || platform === "x"
  )
  const nonThreadPlatforms = parsed.data.destinations.filter(
    (platform) =>
      platform !== "threads" && platform !== "x" && platform !== "tiktok"
  )
  const supabase = createAdminClient()
  const { data: xConnection, error: xConnectionError } =
    threadPlatforms.includes("x")
      ? await supabase
          .from("platform_connections")
          .select("settings")
          .eq("user_id", user.id)
          .eq("platform", "x")
          .maybeSingle()
      : { data: null, error: null }
  if (xConnectionError) {
    throw new Error(
      `X 계정 설정을 확인하지 못했습니다: ${xConnectionError.message}`
    )
  }
  const xPremium = hasXPremiumSetting(xConnection?.settings)
  validateLimits(
    threadPlatforms,
    socialText,
    discordContent,
    images,
    undefined,
    xPremium
  )
  const threadReplies = parsed.data.threadReplies.map((reply, index) => {
    const html = sanitizeEditorHtml(reply.contentHtml)
    const text = htmlToPlainTextWithUrls(html)
    const replyImages = imageUrlsFromHtml(html)
    if (!text && replyImages.length === 0) {
      throw new Error(`답글 ${index + 1}에 내용 또는 이미지를 추가해 주세요.`)
    }
    if (threadPlatforms.length > 0) {
      validateLimits(
        threadPlatforms,
        text,
        text,
        replyImages,
        `답글 ${index + 1}`,
        xPremium
      )
    }
    return { html, text, imageUrls: replyImages }
  })
  const mergedHtml = sanitizeEditorHtml(
    mergeEditorHtml([sanitized, ...threadReplies.map((reply) => reply.html)])
  )
  const mergedSocialText = htmlToPlainTextWithUrls(mergedHtml)
  const mergedDiscordText = htmlToDiscordMarkdown(mergedHtml)
  const mergedDiscordContent = parsed.data.title
    ? `**${parsed.data.title}**\n\n${mergedDiscordText}`
    : mergedDiscordText
  const mergedImageUrls = imageUrlsFromHtml(mergedHtml)
  validateLimits(
    nonThreadPlatforms,
    mergedSocialText,
    mergedDiscordContent,
    mergedImageUrls
  )
  let tiktokOptions: TikTokPhotoPublishOptions | null = null
  if (parsed.data.destinations.includes("tiktok")) {
    if (!parsed.data.tiktokOptions)
      throw new Error("TikTok 게시 설정을 입력해 주세요.")
    const description = htmlToPlainText(sanitized)
    validateLimits(["tiktok"], description, description, images)
    const { data: unresolved, error: unresolvedError } = await supabase
      .from("post_destinations")
      .select("id, posts!inner(user_id)")
      .eq("platform", "tiktok")
      .eq("requires_manual_review", true)
      .is("external_publish_id", null)
      .eq("posts.user_id", user.id)
      .limit(1)
    if (unresolvedError) throw new Error(unresolvedError.message)
    if ((unresolved?.length ?? 0) > 0) {
      throw new Error(
        "이전 TikTok 요청 결과를 확인해야 합니다. TikTok 계정을 확인한 뒤 게시 설정에서 확인 완료를 눌러 주세요."
      )
    }
    const [creatorInfo, tiktokPhotoImages] = await Promise.all([
      queryTikTokCreatorInfo(user.id),
      prepareTikTokPhotoImages(user.id, images),
    ])
    tiktokOptions = validateTikTokPhotoPublishOptions({
      draft: parsed.data.tiktokOptions,
      description,
      imageCount: images.length,
      creatorInfo,
    })
    await verifyTikTokPhotoImageUrls(tiktokPhotoImages)
  }
  const extensionPlatforms = parsed.data.destinations.filter(
    (platform): platform is "naver_cafe" | "soop" =>
      platform === "naver_cafe" || platform === "soop"
  )
  const [soopHtml, extensionConnections] = await Promise.all([
    parsed.data.destinations.includes("soop")
      ? preparePostHtmlForSoop(user.id, mergedHtml)
      : Promise.resolve(null),
    Promise.all(
      extensionPlatforms.map(async (platform) => {
        const { data, error } = await supabase
          .from("platform_connections")
          .select("settings")
          .eq("user_id", user.id)
          .eq("platform", platform)
          .maybeSingle()
        if (error) throw new Error(error.message)
        return {
          platform,
          settings: (data?.settings ?? {}) as Record<string, string>,
        }
      })
    ),
  ])

  const persistedPost = await persistPost(
    user.id,
    parsed.data,
    threadReplies,
    tiktokOptions
  )
  if (!persistedPost.ok) {
    return { ok: false, error: persistedPost.error }
  }

  const { postId } = persistedPost
  const extensionJobs: ExtensionPublishJob[] = []
  const results: PublishResult["results"] = []

  for (const { platform, settings } of extensionConnections) {
    const payload: Record<string, string | boolean> =
      platform === "naver_cafe"
        ? {
            clubId: settings.clubId ?? "",
            menuname: settings.menuname ?? "",
            subject: parsed.data.title,
            contentHtml: mergedHtml,
            submit: true,
            autoClose: true,
          }
        : {
            platform: "soop",
            userid: settings.userid ?? "",
            boardId: settings.boardId ?? "",
            subject: parsed.data.title,
            contentHtml: soopHtml ?? mergedHtml,
            submit: true,
            autoClose: true,
          }
    const missingSettings =
      platform === "naver_cafe"
        ? !settings.clubId || !settings.menuname
        : !settings.userid || !settings.boardId
    if (missingSettings) {
      results.push({
        platform,
        ok: false,
        message: "설정에서 게시판 정보를 입력해 주세요.",
      })
      continue
    }
    extensionJobs.push({
      requestId: randomUUID(),
      platform,
      messageType:
        platform === "naver_cafe"
          ? "SENDBASE_NAVER_CAFE_AUTOWRITE"
          : "SENDBASE_SOOP_AUTOWRITE",
      payload,
    })
  }

  await Promise.all(
    results.map(async (result) => {
      const { error } = await supabase
        .from("post_destinations")
        .update({ status: "failed", error_message: "게시판 설정 누락" })
        .eq("post_id", postId)
        .eq("platform", result.platform)
      if (error) throw new Error(error.message)
    })
  )

  const apiPlatforms = parsed.data.destinations.filter(
    (platform): platform is ApiPublishPlatform =>
      apiPlatformSchema.safeParse(platform).success
  )
  if (extensionJobs.length === 0 && apiPlatforms.length === 0) {
    await finalizePost(postId)
  }
  revalidatePath("/dashboard")
  return {
    ok: true,
    data: { postId, apiPlatforms, extensionJobs, results },
  }
}

export async function publishApiDestinationsAction(
  input: unknown
): Promise<PublishDestinationResult[]> {
  const user = await requireUser()
  const postId = postIdSchema.parse(input)
  const supabase = createAdminClient()
  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, title, content_html, thread_replies")
    .eq("id", postId)
    .eq("user_id", user.id)
    .maybeSingle()
  if (postError) throw new Error(postError.message)
  if (!post) throw new Error("게시물을 찾을 수 없습니다.")

  const { data: claimedDestinations, error: claimError } = await supabase
    .from("post_destinations")
    .update({ status: "publishing", updated_at: new Date().toISOString() })
    .eq("post_id", postId)
    .eq("status", "pending")
    .in("platform", apiPlatformSchema.options)
    .select("id, platform, publish_options")
  if (claimError) throw new Error(claimError.message)

  const platforms = (claimedDestinations ?? []).flatMap((destination) => {
    const parsedPlatform = apiPlatformSchema.safeParse(destination.platform)
    return parsedPlatform.success
      ? [
          {
            destinationId: destination.id,
            platform: parsedPlatform.data,
            publishOptions: destination.publish_options,
          },
        ]
      : []
  })
  const sanitized = sanitizeEditorHtml(post.content_html)
  const socialText = htmlToPlainTextWithUrls(sanitized)
  const discordText = htmlToDiscordMarkdown(sanitized)
  const discordContent = post.title
    ? `**${post.title}**\n\n${discordText}`
    : discordText
  const imageUrls = imageUrlsFromHtml(sanitized)
  const threadReplies = prepareStoredThreadReplies(post.thread_replies)
  const mergedHtml = sanitizeEditorHtml(
    mergeEditorHtml([sanitized, ...threadReplies.map((reply) => reply.html)])
  )
  const mergedSocialText = htmlToPlainTextWithUrls(mergedHtml)
  const mergedDiscordText = htmlToDiscordMarkdown(mergedHtml)
  const mergedDiscordContent = post.title
    ? `**${post.title}**\n\n${mergedDiscordText}`
    : mergedDiscordText
  const mergedImageUrls = imageUrlsFromHtml(mergedHtml)

  const results = await Promise.all(
    platforms.map(
      async ({
        destinationId,
        platform,
        publishOptions,
      }): Promise<PublishDestinationResult> => {
        let tiktokInitializationStarted = false
        let tiktokPublishId: string | null = null
        try {
          if (platform === "tiktok") {
            const options =
              tiktokPhotoPublishOptionsSchema.parse(publishOptions)
            const photoImages = await prepareTikTokPhotoImages(
              user.id,
              imageUrls
            )
            await verifyTikTokPhotoImageUrls(photoImages)
            tiktokInitializationStarted = true
            const initialized = await initializeTikTokPhotoPost(
              user.id,
              options,
              photoImages,
              destinationId
            )
            tiktokPublishId = initialized.publishId
            const { error } = await supabase
              .from("post_destinations")
              .update({
                status: "processing",
                external_publish_id: initialized.publishId,
                provider_status: "PROCESSING_DOWNLOAD",
                next_poll_at: new Date(Date.now() + 15_000).toISOString(),
                error_message: null,
                updated_at: new Date().toISOString(),
              })
              .eq("post_id", postId)
              .eq("platform", platform)
            if (error) throw new Error(error.message)
            return {
              platform,
              ok: true,
              message: "TikTok에서 처리 중입니다.",
            }
          }
          const publishToPlatform = await createApiPlatformPublisher(
            platform,
            user.id
          )
          const usesThread = platform === "threads" || platform === "x"
          const published = await publishToPlatform({
            title: post.title,
            text: usesThread ? socialText : mergedSocialText,
            discordText: usesThread ? discordContent : mergedDiscordContent,
            imageUrls: usesThread ? imageUrls : mergedImageUrls,
          })

          if (usesThread) {
            const { error } = await supabase
              .from("post_destinations")
              .update({
                external_post_id: published.id,
                external_url: published.url,
                updated_at: new Date().toISOString(),
              })
              .eq("post_id", postId)
              .eq("platform", platform)
            if (error) throw new Error(error.message)

            let replyToId = published.id
            for (const reply of threadReplies) {
              const replyResult = await publishToPlatform({
                title: "",
                text: reply.text,
                discordText: reply.text,
                imageUrls: reply.imageUrls,
                replyToId,
              })
              replyToId = replyResult.id
            }
          }

          const { error } = await supabase
            .from("post_destinations")
            .update({
              status: "published",
              external_post_id: published.id,
              external_url: published.url,
              error_message: null,
              updated_at: new Date().toISOString(),
            })
            .eq("post_id", postId)
            .eq("platform", platform)
          if (error) throw new Error(error.message)

          return {
            platform,
            ok: true,
            message: published.warning ?? "게시되었습니다.",
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "게시하지 못했습니다."
          const uncertainTikTokInitialization =
            platform === "tiktok" &&
            tiktokInitializationStarted &&
            !(error instanceof TikTokApiError)
          const { error: updateError } = await supabase
            .from("post_destinations")
            .update({
              status: "failed",
              error_message: message,
              requires_manual_review: uncertainTikTokInitialization,
              external_publish_id: tiktokPublishId,
              next_poll_at:
                uncertainTikTokInitialization && tiktokPublishId
                  ? new Date(Date.now() + 10 * 60_000).toISOString()
                  : null,
              updated_at: new Date().toISOString(),
            })
            .eq("post_id", postId)
            .eq("platform", platform)
          return {
            platform,
            ok: false,
            message: updateError
              ? `${message} 결과 상태도 저장하지 못했습니다: ${updateError.message}`
              : message,
          }
        }
      }
    )
  )

  await finalizePost(postId)
  revalidatePath("/dashboard")
  return results
}

const extensionResultSchema = z.object({
  platform: extensionPlatformSchema,
  ok: z.boolean(),
  message: z.string().max(500),
  url: z.string().url().optional(),
})

const extensionResultsSchema = z.object({
  postId: postIdSchema,
  results: z.array(extensionResultSchema).max(2),
})

export async function recordExtensionResultsAction(input: unknown) {
  const user = await requireUser()
  const parsed = extensionResultsSchema.parse(input)
  const supabase = createAdminClient()
  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id")
    .eq("id", parsed.postId)
    .eq("user_id", user.id)
    .maybeSingle()
  if (postError) throw new Error(postError.message)
  if (!post) throw new Error("게시물을 찾을 수 없습니다.")
  await Promise.all(
    parsed.results.map(async (result) => {
      const { error } = await supabase
        .from("post_destinations")
        .update({
          status: result.ok ? "published" : "failed",
          error_message: result.ok ? null : result.message,
          external_url: result.url ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("post_id", parsed.postId)
        .eq("platform", result.platform)
      if (error) throw new Error(error.message)
    })
  )
  await finalizePost(parsed.postId)
  revalidatePath("/dashboard")
}

async function finalizePost(postId: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("post_destinations")
    .select("status")
    .eq("post_id", postId)
  if (error) throw new Error(error.message)
  const statuses = (data ?? []).map((row) => row.status as string)
  const pending = statuses.some(
    (status) =>
      status === "pending" || status === "publishing" || status === "processing"
  )
  if (pending) return
  const publishedCount = statuses.filter(
    (status) => status === "published"
  ).length
  const failedCount = statuses.filter((status) => status === "failed").length
  const status =
    failedCount === 0
      ? "published"
      : publishedCount === 0
        ? "failed"
        : "partial"
  const { error: updateError } = await supabase
    .from("posts")
    .update({
      status,
      published_at: publishedCount > 0 ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", postId)
  if (updateError) throw new Error(updateError.message)
}

export async function uploadPostImageAction(formData: FormData) {
  const user = await requireUser()
  const file = formData.get("file")
  if (!(file instanceof File)) throw new Error("이미지 파일을 선택해 주세요.")
  if (!isPostImageMimeType(file.type))
    throw new Error("JPG, PNG, WebP, GIF 이미지만 첨부할 수 있습니다.")
  if (file.size > POST_IMAGE_MAX_BYTES)
    throw new Error("이미지는 10MB 이하여야 합니다.")
  const optimized = await optimizePostImage(
    Buffer.from(await file.arrayBuffer())
  )
  const imageId = randomUUID()
  const basePath = `${user.id}/${new Date().getUTCFullYear()}/${imageId}`
  const originalPath = `${basePath}.${optimized.extension}`
  const thumbnailPath = `${basePath}-thumbnail.${optimized.extension}`
  const supabase = createAdminClient()
  const bucket = supabase.storage.from("post-media")
  const [originalUpload, thumbnailUpload] = await Promise.all([
    bucket.upload(originalPath, optimized.original, {
      contentType: optimized.contentType,
      cacheControl: "31536000",
      upsert: false,
    }),
    bucket.upload(thumbnailPath, optimized.thumbnail, {
      contentType: optimized.contentType,
      cacheControl: "31536000",
      upsert: false,
    }),
  ])
  const uploadError = originalUpload.error ?? thumbnailUpload.error
  if (uploadError) {
    await bucket.remove([originalPath, thumbnailPath])
    throw new Error(`이미지 업로드에 실패했습니다: ${uploadError.message}`)
  }

  return {
    url: bucket.getPublicUrl(originalPath).data.publicUrl,
    thumbnailUrl: bucket.getPublicUrl(thumbnailPath).data.publicUrl,
    width: optimized.width,
    height: optimized.height,
  }
}
