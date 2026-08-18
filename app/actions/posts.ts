"use server"

import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireUser } from "@/lib/auth/session"
import {
  countCharacters,
  countLinks,
  platformLimits,
} from "@/lib/platforms/limits"
import { publishToApiPlatform } from "@/lib/platforms/publish"
import {
  htmlToPlainText,
  imageMetadataFromHtml,
  imageUrlsFromHtml,
  sanitizeEditorHtml,
} from "@/lib/posts/content"
import { optimizePostImage, preparePostHtmlForSoop } from "@/lib/posts/images"
import { getPostDetail, getPostHistory } from "@/lib/posts/queries"
import { postFormSchema } from "@/lib/posts/schema"
import { createAdminClient } from "@/lib/supabase/admin"
import type {
  ExtensionPublishJob,
  PublishPlatform,
  PublishResult,
} from "@/lib/types"

const historyCursorSchema = z.string().datetime({ offset: true }).optional()

export async function getOlderPostsAction(before?: string) {
  const user = await requireUser()
  const cursor = historyCursorSchema.parse(before)
  return getPostHistory(user.id, cursor)
}

export async function getPostDetailAction(postId: string) {
  const user = await requireUser()
  return getPostDetail(user.id, z.string().uuid().parse(postId))
}

function validateLimits(
  platforms: PublishPlatform[],
  text: string,
  images: string[]
) {
  for (const platform of platforms) {
    const limit = platformLimits[platform]
    if (
      limit.maxCharacters &&
      countCharacters(platform, text) > limit.maxCharacters
    ) {
      throw new Error(
        `${limit.label} 글자 수 제한(${limit.maxCharacters}자)을 초과했습니다.`
      )
    }
    if (limit.maxImages && images.length > limit.maxImages) {
      throw new Error(
        `${limit.label} 이미지 제한(${limit.maxImages}개)을 초과했습니다.`
      )
    }
    if (limit.maxLinks && countLinks(text) > limit.maxLinks) {
      throw new Error(
        `${limit.label} 링크 제한(${limit.maxLinks}개)을 초과했습니다.`
      )
    }
  }
}

async function persistPost(
  userId: string,
  input: z.infer<typeof postFormSchema>
) {
  const html = sanitizeEditorHtml(input.contentHtml)
  const text = htmlToPlainText(html)
  const imageUrls = imageUrlsFromHtml(html)
  const imageMetadata = imageMetadataFromHtml(html)
  const supabase = createAdminClient()
  const values = {
    user_id: userId,
    title: input.title,
    content_html: html,
    content_text: text,
    image_urls: imageUrls,
    image_metadata: imageMetadata,
    status: "publishing" as const,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from("posts")
    .insert(values)
    .select("id")
    .single()
  if (error) throw new Error(`게시물을 저장하지 못했습니다: ${error.message}`)
  const postId = data.id as string

  const { error: destinationError } = await supabase
    .from("post_destinations")
    .insert(
      input.destinations.map((platform) => ({
        post_id: postId,
        platform,
        status: "pending",
      }))
    )
  if (destinationError) throw new Error(destinationError.message)
  return { postId, html, text, imageUrls }
}

export async function publishPostAction(
  input: unknown
): Promise<PublishResult> {
  const user = await requireUser()
  const parsed = postFormSchema.safeParse(input)
  if (!parsed.success)
    throw new Error(
      parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요."
    )
  const sanitized = sanitizeEditorHtml(parsed.data.contentHtml)
  const plainText = htmlToPlainText(sanitized)
  const images = imageUrlsFromHtml(sanitized)
  if (!plainText && images.length === 0)
    throw new Error("본문 또는 이미지를 추가해 주세요.")
  validateLimits(parsed.data.destinations, plainText, images)
  const soopHtml = parsed.data.destinations.includes("soop")
    ? await preparePostHtmlForSoop(user.id, sanitized)
    : null

  const { postId, html, text, imageUrls } = await persistPost(
    user.id,
    parsed.data
  )
  const supabase = createAdminClient()
  const extensionJobs: ExtensionPublishJob[] = []
  const results: PublishResult["results"] = []

  for (const platform of parsed.data.destinations) {
    if (platform === "naver_cafe" || platform === "soop") {
      const { data: connection } = await supabase
        .from("platform_connections")
        .select("settings")
        .eq("user_id", user.id)
        .eq("platform", platform)
        .maybeSingle()
      const settings = (connection?.settings ?? {}) as Record<string, string>
      const payload: Record<string, string | boolean> =
        platform === "naver_cafe"
          ? {
              clubId: settings.clubId ?? "",
              menuname: settings.menuname ?? "",
              subject: parsed.data.title,
              contentHtml: html,
              submit: true,
              autoClose: true,
            }
          : {
              platform: "soop",
              userid: settings.userid ?? "",
              boardId: settings.boardId ?? "",
              subject: parsed.data.title,
              contentHtml: soopHtml ?? html,
              submit: true,
              autoClose: true,
            }
      if (
        (platform === "naver_cafe" &&
          (!settings.clubId || !settings.menuname)) ||
        (platform === "soop" && (!settings.userid || !settings.boardId))
      ) {
        results.push({
          platform,
          ok: false,
          message: "설정에서 게시판 정보를 입력해 주세요.",
        })
        await supabase
          .from("post_destinations")
          .update({ status: "failed", error_message: "게시판 설정 누락" })
          .eq("post_id", postId)
          .eq("platform", platform)
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
      results.push({
        platform,
        ok: true,
        message: "확장 프로그램으로 전송 중입니다.",
      })
      continue
    }

    try {
      const published = await publishToApiPlatform(platform, {
        userId: user.id,
        title: parsed.data.title,
        text,
        imageUrls,
      })
      await supabase
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
      results.push({ platform, ok: true, message: "게시되었습니다." })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "게시하지 못했습니다."
      await supabase
        .from("post_destinations")
        .update({
          status: "failed",
          error_message: message,
          updated_at: new Date().toISOString(),
        })
        .eq("post_id", postId)
        .eq("platform", platform)
      results.push({ platform, ok: false, message })
    }
  }

  if (extensionJobs.length === 0) await finalizePost(postId)
  revalidatePath("/dashboard")
  return { postId, extensionJobs, results }
}

const extensionResultSchema = z.object({
  postId: z.string().uuid(),
  platform: z.enum(["naver_cafe", "soop"]),
  ok: z.boolean(),
  message: z.string().max(500),
  url: z.string().url().optional(),
  response: z.record(z.string(), z.unknown()).optional(),
  completedUrlResponse: z.record(z.string(), z.unknown()).optional(),
})

export async function recordExtensionResultAction(input: unknown) {
  const user = await requireUser()
  const parsed = extensionResultSchema.parse(input)
  console.info("[publish][extension-response]", {
    postId: parsed.postId,
    platform: parsed.platform,
    ok: parsed.ok,
    message: parsed.message,
    response: parsed.response,
    completedUrlResponse: parsed.completedUrlResponse,
  })
  const supabase = createAdminClient()
  const { data: post } = await supabase
    .from("posts")
    .select("id")
    .eq("id", parsed.postId)
    .eq("user_id", user.id)
    .maybeSingle()
  if (!post) throw new Error("게시물을 찾을 수 없습니다.")
  await supabase
    .from("post_destinations")
    .update({
      status: parsed.ok ? "published" : "failed",
      error_message: parsed.ok ? null : parsed.message,
      external_url: parsed.url ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("post_id", parsed.postId)
    .eq("platform", parsed.platform)
  await finalizePost(parsed.postId)
  revalidatePath("/dashboard")
}

async function finalizePost(postId: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from("post_destinations")
    .select("status")
    .eq("post_id", postId)
  const statuses = (data ?? []).map((row) => row.status as string)
  const pending = statuses.some(
    (status) => status === "pending" || status === "publishing"
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
  await supabase
    .from("posts")
    .update({
      status,
      published_at: publishedCount > 0 ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", postId)
}

export async function uploadPostImageAction(formData: FormData) {
  const user = await requireUser()
  const file = formData.get("file")
  if (!(file instanceof File)) throw new Error("이미지 파일을 선택해 주세요.")
  const allowed = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ])
  if (!allowed.has(file.type))
    throw new Error("JPG, PNG, WebP, GIF 이미지만 첨부할 수 있습니다.")
  if (file.size > 10 * 1024 * 1024)
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
