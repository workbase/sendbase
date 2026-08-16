import type { PublishPlatform } from "@/lib/types"

export type PlatformLimit = {
  label: string
  shortLabel: string
  maxCharacters: number | null
  maxImages: number | null
  maxLinks: number | null
  note: string
}

export const platformLimits: Record<PublishPlatform, PlatformLimit> = {
  threads: {
    label: "Threads",
    shortLabel: "Th",
    maxCharacters: 500,
    maxImages: 20,
    maxLinks: 1,
    note: "첫 링크만 미리보기로 표시",
  },
  x: {
    label: "X",
    shortLabel: "X",
    maxCharacters: 280,
    maxImages: 4,
    maxLinks: null,
    note: "링크는 23자로 계산",
  },
  discord: {
    label: "Discord",
    shortLabel: "Ds",
    maxCharacters: 2_000,
    maxImages: 10,
    maxLinks: null,
    note: "웹훅 메시지 기준",
  },
  naver_cafe: {
    label: "네이버 카페",
    shortLabel: "N",
    maxCharacters: null,
    maxImages: null,
    maxLinks: null,
    note: "카페별 게시판 정책 적용",
  },
  soop: {
    label: "SOOP 게시판",
    shortLabel: "S",
    maxCharacters: null,
    maxImages: null,
    maxLinks: null,
    note: "게시판별 정책 적용",
  },
}

const urlPattern = /https?:\/\/[^\s]+/g

export function countCharacters(platform: PublishPlatform, text: string) {
  if (platform !== "x") return Array.from(text).length
  const urls = text.match(urlPattern) ?? []
  const withoutUrls = text.replace(urlPattern, "")
  return Array.from(withoutUrls).length + urls.length * 23
}

export function countLinks(text: string) {
  return (text.match(urlPattern) ?? []).length
}
