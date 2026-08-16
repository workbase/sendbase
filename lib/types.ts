export const publishPlatforms = [
  "threads",
  "x",
  "discord",
  "naver_cafe",
  "soop",
] as const

export type PublishPlatform = (typeof publishPlatforms)[number]
export type LoginProvider = "chzzk" | "soop" | "cime"

export type AppUser = {
  id: string
  displayName: string
  avatarUrl: string | null
}

export type PostSummary = {
  id: string
  title: string
  status: "draft" | "publishing" | "published" | "partial" | "failed"
  updatedAt: string
  links: PublishedPostLink[]
}

export type PublishedPostLink = {
  platform: PublishPlatform
  url: string
}

export type PostDetail = PostSummary & {
  contentHtml: string
  contentText: string
  imageUrls: string[]
}

export type PlatformConnection = {
  platform: PublishPlatform
  displayName: string | null
  connected: boolean
  settings: Record<string, string>
}

export type ExtensionPublishJob = {
  requestId: string
  platform: "naver_cafe" | "soop"
  messageType: "WORKBASE_NAVER_CAFE_AUTOWRITE" | "WORKBASE_SOOP_AUTOWRITE"
  payload: Record<string, string | boolean>
}

export type PublishResult = {
  postId: string
  extensionJobs: ExtensionPublishJob[]
  results: Array<{
    platform: PublishPlatform
    ok: boolean
    message: string
  }>
}
