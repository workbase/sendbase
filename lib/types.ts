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
  crispSessionToken: string
  loginProviders: LoginProvider[]
}

export type PostSummary = {
  id: string
  title: string
  status: "draft" | "publishing" | "published" | "partial" | "failed"
  updatedAt: string
  links: PublishedPostLink[]
}

export type PostImage = {
  url: string
  thumbnailUrl: string
  width: number
  height: number
  alt: string
}

export type PostHistoryItem = PostSummary & {
  contentPreview: string
  images: PostImage[]
  destinations: PublishPlatform[]
}

export type PublishedPostLink = {
  platform: PublishPlatform
  url: string
}

export type PostDetail = PostHistoryItem & {
  editorTitle: string
  contentHtml: string
  contentText: string
  imageUrls: string[]
  threadReplies: PostThreadReply[]
}

export type PostThreadReply = {
  contentHtml: string
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
  messageType: "SENDBASE_NAVER_CAFE_AUTOWRITE" | "SENDBASE_SOOP_AUTOWRITE"
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

export type PublishPostActionResult =
  { ok: true; data: PublishResult } | { ok: false; error: string }
