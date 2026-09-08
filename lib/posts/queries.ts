import { cache } from "react"

import { createAdminClient } from "@/lib/supabase/admin"
import { publicPlatformSettings } from "@/lib/platforms/public-settings"
import { publishPlatforms } from "@/lib/types"
import type {
  PlatformConnection,
  PostDetail,
  PostHistoryItem,
  PostImage,
  PostSummary,
  PublishedPostLink,
  PublishPlatform,
} from "@/lib/types"
import { POST_HISTORY_PAGE_SIZE } from "@/lib/posts/constants"

const recentPostLinkOrder: PublishPlatform[] = [
  "x",
  "threads",
  "tiktok",
  "naver_cafe",
  "soop",
]
const recentPostLinkPlatforms = new Set(recentPostLinkOrder)
const publishPlatformSet = new Set<PublishPlatform>(publishPlatforms)
const POST_PREVIEW_LENGTH = 320

type DestinationRow = {
  platform: string
  external_post_id: string | null
  external_publish_id: string | null
  external_url: string | null
  publicly_available: boolean | null
  status: string
}

type StoredThreadReply = {
  contentHtml: string
}

export type PostHistoryRow = {
  id: string
  title: string
  content_text: string
  image_metadata: unknown
  status: PostSummary["status"]
  updated_at: string
  post_destinations: DestinationRow[]
}

export type ConnectionRow = {
  platform: string
  display_name: string | null
  access_token_encrypted: string | null
  webhook_url_encrypted: string | null
  settings: Record<string, unknown> | null
}

function tikTokPostUrl(destination: DestinationRow) {
  return destination.publicly_available === true &&
    destination.external_post_id &&
    /^\d+$/.test(destination.external_post_id)
    ? `https://www.tiktok.com/player/v1/${destination.external_post_id}`
    : null
}

function destinationUrl(destination: DestinationRow) {
  if (
    destination.platform === "tiktok" &&
    destination.publicly_available === false
  ) {
    return null
  }
  return (
    destination.external_url ??
    (destination.platform === "tiktok" ? tikTokPostUrl(destination) : null)
  )
}

function publishedLinks(destinations: DestinationRow[]): PublishedPostLink[] {
  return destinations
    .flatMap((destination) => {
      const platform = destination.platform as PublishPlatform
      const url = destinationUrl(destination)
      return url && recentPostLinkPlatforms.has(platform)
        ? [{ platform, url }]
        : []
    })
    .sort(
      (left, right) =>
        recentPostLinkOrder.indexOf(left.platform) -
        recentPostLinkOrder.indexOf(right.platform)
    )
}

function destinationPlatforms(
  destinations: DestinationRow[]
): PublishPlatform[] {
  return destinations.flatMap((destination) => {
    const platform = destination.platform as PublishPlatform
    return publishPlatformSet.has(platform) ? [platform] : []
  })
}

function processingDestinationPlatforms(
  destinations: DestinationRow[]
): PublishPlatform[] {
  return destinations.flatMap((destination) => {
    const platform = destination.platform as PublishPlatform
    return platform === "tiktok" &&
      destination.status !== "failed" &&
      destination.publicly_available !== false &&
      Boolean(destination.external_publish_id) &&
      !destinationUrl(destination) &&
      publishPlatformSet.has(platform)
      ? [platform]
      : []
  })
}

function postImages(value: unknown): PostImage[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return []
    const image = item as Record<string, unknown>
    return typeof image.url === "string" &&
      typeof image.thumbnailUrl === "string" &&
      typeof image.width === "number" &&
      typeof image.height === "number" &&
      typeof image.alt === "string"
      ? [image as PostImage]
      : []
  })
}

function postThreadReplies(value: unknown): StoredThreadReply[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return []
    const reply = item as Record<string, unknown>
    return typeof reply.contentHtml === "string"
      ? [{ contentHtml: reply.contentHtml }]
      : []
  })
}

export function mapPostHistoryRow(post: PostHistoryRow): PostHistoryItem {
  const destinations = post.post_destinations ?? []

  return {
    id: post.id,
    title: post.title || "제목 없는 게시물",
    contentPreview: post.content_text.slice(0, POST_PREVIEW_LENGTH),
    images: postImages(post.image_metadata),
    status: post.status,
    updatedAt: post.updated_at,
    links: publishedLinks(destinations),
    destinations: destinationPlatforms(destinations),
    processingDestinations: processingDestinationPlatforms(destinations),
  }
}

export function mapConnectionRow(item: ConnectionRow): PlatformConnection {
  const platform = item.platform as PublishPlatform
  const settings = publicPlatformSettings(platform, item.settings)
  return {
    platform,
    displayName: item.display_name,
    connected:
      platform === "discord"
        ? Boolean(item.webhook_url_encrypted)
        : platform === "threads" || platform === "x" || platform === "tiktok"
          ? Boolean(item.access_token_encrypted)
          : Object.keys(settings).length > 0,
    settings,
  }
}

export const getPosts = cache(
  async (userId: string): Promise<PostSummary[]> => {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("posts")
      .select(
        "id, title, status, updated_at, post_destinations(platform, external_post_id, external_publish_id, external_url, publicly_available, status)"
      )
      .eq("user_id", userId)
      .neq("status", "draft")
      .order("updated_at", { ascending: false })
      .limit(50)
    if (error) throw new Error(error.message)
    return (data ?? []).map((post) => ({
      id: post.id as string,
      title: (post.title as string) || "제목 없는 게시물",
      status: post.status as PostSummary["status"],
      updatedAt: post.updated_at as string,
      links: publishedLinks((post.post_destinations ?? []) as DestinationRow[]),
    }))
  }
)

export const getPostHistory = cache(
  async (
    userId: string,
    before?: string,
    limit = POST_HISTORY_PAGE_SIZE
  ): Promise<PostHistoryItem[]> => {
    const supabase = createAdminClient()
    let query = supabase
      .from("posts")
      .select(
        "id, title, content_text, image_metadata, status, updated_at, post_destinations(platform, external_post_id, external_publish_id, external_url, publicly_available, status)"
      )
      .eq("user_id", userId)
      .neq("status", "draft")
      .order("updated_at", { ascending: false })
      .limit(limit)

    if (before) query = query.lt("updated_at", before)

    const { data, error } = await query
    if (error) throw new Error(error.message)

    return (data ?? []).map((post) =>
      mapPostHistoryRow(post as unknown as PostHistoryRow)
    )
  }
)

export const getPostDetail = cache(
  async (userId: string, postId: string): Promise<PostDetail | null> => {
    const supabase = createAdminClient()
    const [postResult, destinationsResult] = await Promise.all([
      supabase
        .from("posts")
        .select(
          "id, title, content_html, content_text, image_urls, image_metadata, thread_replies, status, updated_at"
        )
        .eq("id", postId)
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("post_destinations")
        .select(
          "platform, external_post_id, external_publish_id, external_url, publicly_available, status"
        )
        .eq("post_id", postId),
    ])
    if (postResult.error) throw new Error(postResult.error.message)
    if (destinationsResult.error)
      throw new Error(destinationsResult.error.message)
    if (!postResult.data) return null

    const post = postResult.data
    return {
      id: post.id as string,
      title: (post.title as string) || "제목 없는 게시물",
      editorTitle: post.title as string,
      contentHtml: post.content_html as string,
      contentText: post.content_text as string,
      imageUrls: post.image_urls as string[],
      threadReplies: postThreadReplies(post.thread_replies),
      contentPreview: (post.content_text as string).slice(
        0,
        POST_PREVIEW_LENGTH
      ),
      images: postImages(post.image_metadata),
      status: post.status as PostSummary["status"],
      updatedAt: post.updated_at as string,
      links: publishedLinks(
        (destinationsResult.data ?? []) as DestinationRow[]
      ),
      destinations: destinationPlatforms(
        (destinationsResult.data ?? []) as DestinationRow[]
      ),
      processingDestinations: processingDestinationPlatforms(
        (destinationsResult.data ?? []) as DestinationRow[]
      ),
    }
  }
)

export const getConnections = cache(
  async (userId: string): Promise<PlatformConnection[]> => {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("platform_connections")
      .select(
        "platform, display_name, access_token_encrypted, webhook_url_encrypted, settings"
      )
      .eq("user_id", userId)
    if (error) throw new Error(error.message)
    return (data ?? []).map((item) =>
      mapConnectionRow(item as unknown as ConnectionRow)
    )
  }
)
