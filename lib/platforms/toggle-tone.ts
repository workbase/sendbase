import type { PublishPlatform } from "@/lib/types"

export const platformToggleTone: Record<PublishPlatform, string> = {
  threads: "bg-platform-threads text-white",
  x: "bg-platform-x text-white",
  discord: "bg-platform-discord text-white",
  tiktok: "bg-platform-tiktok text-white",
  naver_cafe: "bg-platform-naver-cafe text-white",
  soop: "bg-platform-soop text-white",
}

export const platformStatusTone: Record<PublishPlatform, string> = {
  threads: "bg-platform-threads-icon",
  x: "bg-platform-x-icon",
  discord: "bg-platform-discord",
  tiktok: "bg-platform-tiktok-icon",
  naver_cafe: "bg-platform-naver-cafe",
  soop: "bg-platform-soop-icon",
}
