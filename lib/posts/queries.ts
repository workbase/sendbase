import { cache } from "react"

import { createAdminClient } from "@/lib/supabase/admin"
import type { EditablePost, PlatformConnection, PostSummary, PublishPlatform } from "@/lib/types"

export const getPosts = cache(async (userId: string): Promise<PostSummary[]> => {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("posts")
    .select("id, title, status, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(50)
  if (error) throw new Error(error.message)
  return (data ?? []).map((post) => ({
    id: post.id as string,
    title: (post.title as string) || "제목 없는 초안",
    status: post.status as PostSummary["status"],
    updatedAt: post.updated_at as string,
  }))
})

export const getPost = cache(
  async (userId: string, postId: string): Promise<EditablePost | null> => {
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
        .select("platform")
        .eq("post_id", postId),
    ])
    if (postResult.error) throw new Error(postResult.error.message)
    if (destinationsResult.error) throw new Error(destinationsResult.error.message)
    if (!postResult.data) return null

    const post = postResult.data
    return {
      id: post.id as string,
      title: post.title as string,
      contentHtml: post.content_html as string,
      contentText: post.content_text as string,
      imageUrls: post.image_urls as string[],
      status: post.status as PostSummary["status"],
      updatedAt: post.updated_at as string,
      destinations: (destinationsResult.data ?? []).map(
        (item) => item.platform as PublishPlatform
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
