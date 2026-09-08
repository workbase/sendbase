import type { PublishPlatform } from "@/lib/types"

const publicSettingKeys: Record<PublishPlatform, readonly string[]> = {
  threads: [],
  x: ["xPremium"],
  discord: [],
  tiktok: [],
  naver_cafe: ["cafeUrl", "menuname", "clubId"],
  soop: ["boardUrl", "userid", "boardId"],
}

export function publicPlatformSettings(
  platform: PublishPlatform,
  value: unknown
): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  const settings = value as Record<string, unknown>
  return Object.fromEntries(
    publicSettingKeys[platform].flatMap((key) => {
      const setting = settings[key]
      return typeof setting === "string" ? [[key, setting]] : []
    })
  )
}
