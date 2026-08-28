import parseTweet from "twitter-text/dist/parseTweet"

import type { PublishPlatform } from "@/lib/types"

export type PlatformLimit = {
  label: string
  minImages: number
  maxCharacters: number | null
  maxImages: number | null
  maxLinks: number | null
  note: string
}

export const X_STANDARD_MAX_CHARACTERS = 280
export const X_PREMIUM_MAX_CHARACTERS = 25_000
export const X_PREMIUM_SETTING_KEY = "xPremium"

export const platformLimits: Record<PublishPlatform, PlatformLimit> = {
  threads: {
    label: "Threads",
    minImages: 0,
    maxCharacters: 500,
    maxImages: 20,
    maxLinks: 5,
    note: "링크는 원문 길이로 계산 · 첫 링크만 미리보기",
  },
  x: {
    label: "X",
    minImages: 0,
    maxCharacters: X_STANDARD_MAX_CHARACTERS,
    maxImages: 4,
    maxLinks: null,
    note: "CJK·이모지는 2자 · 링크는 23자로 계산",
  },
  discord: {
    label: "Discord",
    minImages: 0,
    maxCharacters: 2_000,
    maxImages: 10,
    maxLinks: null,
    note: "Unicode 코드 포인트 · 웹훅 메시지 기준",
  },
  tiktok: {
    label: "TikTok",
    minImages: 1,
    maxCharacters: 4_000,
    maxImages: 35,
    maxLinks: null,
    note: "사진 1~35장 · 본문 4,000 UTF-16 단위",
  },
  naver_cafe: {
    label: "네이버 카페",
    minImages: 0,
    maxCharacters: null,
    maxImages: null,
    maxLinks: null,
    note: "카페별 게시판 정책 적용",
  },
  soop: {
    label: "SOOP 게시판",
    minImages: 0,
    maxCharacters: null,
    maxImages: null,
    maxLinks: null,
    note: "게시판별 정책 적용",
  },
}

export function hasXPremiumSetting(
  settings: Record<string, unknown> | null | undefined
) {
  const value = settings?.[X_PREMIUM_SETTING_KEY]
  return value === true || value === "true"
}

export function getPlatformCharacterLimit(
  platform: PublishPlatform,
  xPremium = false
) {
  if (platform === "x" && xPremium) return X_PREMIUM_MAX_CHARACTERS
  return platformLimits[platform].maxCharacters
}

const urlPattern = /https?:\/\/[^\s]+/g

export function countCharacters(platform: PublishPlatform, text: string) {
  if (platform === "x") return parseTweet(text).weightedLength
  // Threads and TikTok apply limits to UTF-16 code units.
  if (platform === "threads" || platform === "tiktok") return text.length
  return Array.from(text).length
}

export function countLinks(text: string) {
  return (text.match(urlPattern) ?? []).length
}
