import { cache } from "react"

import { createAdminClient } from "@/lib/supabase/admin"
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
  "naver_cafe",
  "soop",
]
const recentPostLinkPlatforms = new Set(recentPostLinkOrder)
const publishPlatformSet = new Set<PublishPlatform>(publishPlatforms)
const POST_PREVIEW_LENGTH = 320

type DestinationRow = {
  platform: string
  external_url: string | null
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
  settings: Record<string, unknown> | null
}

function publishedLinks(destinations: DestinationRow[]): PublishedPostLink[] {
  return destinations
    .flatMap((destination) => {
      const platform = destination.platform as PublishPlatform
      return destination.external_url && recentPostLinkPlatforms.has(platform)
        ? [{ platform, url: destination.external_url }]
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
  }
}

export function mapConnectionRow(item: ConnectionRow): PlatformConnection {
  return {
    platform: item.platform as PublishPlatform,
    displayName: item.display_name,
    connected:
      Boolean(item.access_token_encrypted) ||
      Object.keys(item.settings ?? {}).length > 0,
    settings: (item.settings ?? {}) as Record<string, string>,
  }
}

export const getPosts = cache(
  async (userId: string): Promise<PostSummary[]> => {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("posts")
      .select(
        "id, title, status, updated_at, post_destinations(platform, external_url)"
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
        "id, title, content_text, image_metadata, status, updated_at, post_destinations(platform, external_url)"
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
          "id, title, content_html, content_text, image_urls, image_metadata, status, updated_at"
        )
        .eq("id", postId)
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("post_destinations")
        .select("platform, external_url")
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
    }
  }
)

export const getConnections = cache(
  async (userId: string): Promise<PlatformConnection[]> => {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("platform_connections")
      .select("platform, display_name, access_token_encrypted, settings")
      .eq("user_id", userId)
    if (error) throw new Error(error.message)
    return (data ?? []).map((item) =>
      mapConnectionRow(item as unknown as ConnectionRow)
    )
  }
)
