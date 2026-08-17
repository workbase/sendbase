import { cache } from "react"

import { createAdminClient } from "@/lib/supabase/admin"
import { publishPlatforms } from "@/lib/types"
import type {
  PlatformConnection,
  PostDetail,
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

type DestinationRow = {
  platform: string
  external_url: string | null
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

function destinationPlatforms(destinations: DestinationRow[]): PublishPlatform[] {
  return destinations.flatMap((destination) => {
    const platform = destination.platform as PublishPlatform
    return publishPlatformSet.has(platform) ? [platform] : []
  })
}

export const getPosts = cache(async (userId: string): Promise<PostSummary[]> => {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("posts")
    .select("id, title, status, updated_at, post_destinations(platform, external_url)")
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
})

export const getPostHistory = cache(
  async (
    userId: string,
    before?: string,
    limit = POST_HISTORY_PAGE_SIZE
  ): Promise<PostDetail[]> => {
    const supabase = createAdminClient()
    let query = supabase
      .from("posts")
      .select(
        "id, title, content_html, content_text, image_urls, status, updated_at, post_destinations(platform, external_url)"
      )
      .eq("user_id", userId)
      .neq("status", "draft")
      .order("updated_at", { ascending: false })
      .limit(limit)

    if (before) query = query.lt("updated_at", before)

    const { data, error } = await query
    if (error) throw new Error(error.message)

    return (data ?? []).map((post) => {
      const destinations = (post.post_destinations ?? []) as DestinationRow[]

      return {
        id: post.id as string,
        title: (post.title as string) || "제목 없는 게시물",
        editorTitle: post.title as string,
        contentHtml: post.content_html as string,
        contentText: post.content_text as string,
        imageUrls: post.image_urls as string[],
        status: post.status as PostSummary["status"],
        updatedAt: post.updated_at as string,
        links: publishedLinks(destinations),
        destinations: destinationPlatforms(destinations),
      }
    })
  }
)

export const getPostDetail = cache(
  async (userId: string, postId: string): Promise<PostDetail | null> => {
    const supabase = createAdminClient()
    const [postResult, destinationsResult] = await Promise.all([
      supabase
        .from("posts")
        .select("id, title, content_html, content_text, image_urls, status, updated_at")
        .eq("id", postId)
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("post_destinations")
        .select("platform, external_url")
        .eq("post_id", postId),
    ])
    if (postResult.error) throw new Error(postResult.error.message)
    if (destinationsResult.error) throw new Error(destinationsResult.error.message)
    if (!postResult.data) return null

    const post = postResult.data
    return {
      id: post.id as string,
      title: (post.title as string) || "제목 없는 게시물",
      editorTitle: post.title as string,
      contentHtml: post.content_html as string,
      contentText: post.content_text as string,
      imageUrls: post.image_urls as string[],
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
    return (data ?? []).map((item) => ({
      platform: item.platform as PublishPlatform,
      displayName: item.display_name as string | null,
      connected:
        Boolean(item.access_token_encrypted) ||
        Object.keys((item.settings ?? {}) as Record<string, unknown>).length > 0,
      settings: (item.settings ?? {}) as Record<string, string>,
    }))
  }
)
