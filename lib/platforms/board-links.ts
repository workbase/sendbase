import { z } from "zod"

function parseUrl(value: string) {
  try {
    return new URL(value)
  } catch {
    return null
  }
}

export function getNaverCafeId(cafeUrl: string): string | null {
  const url = parseUrl(cafeUrl)
  if (!url || !["http:", "https:"].includes(url.protocol) || url.hostname !== "cafe.naver.com") {
    return null
  }

  const pathSegments = url.pathname.split("/").filter(Boolean)
  const cafesIndex = pathSegments.indexOf("cafes")
  const clubId = cafesIndex === -1 ? undefined : pathSegments[cafesIndex + 1]

  return clubId && /^\d+$/.test(clubId) ? clubId : null
}

export function getSoopBoardSettings(
  boardUrl: string
): { userid: string; boardId: string } | null {
  const url = parseUrl(boardUrl)
  if (
    !url ||
    !["http:", "https:"].includes(url.protocol) ||
    !["sooplive.com", "www.sooplive.com"].includes(url.hostname)
  ) {
    return null
  }

  const [station, userid, board, boardId] = url.pathname.split("/").filter(Boolean)
  if (
    station !== "station" ||
    board !== "board" ||
    !userid ||
    !/^[a-zA-Z0-9_-]+$/.test(userid) ||
    !boardId ||
    !/^\d+$/.test(boardId)
  ) {
    return null
  }

  return { userid, boardId }
}

export const naverCafeSettingsInputSchema = z.object({
  cafeUrl: z
    .string()
    .trim()
    .min(1, "카페 링크를 입력해 주세요.")
    .refine(
      (value) => getNaverCafeId(value) !== null,
      "네이버 카페 링크를 입력해 주세요."
    ),
  menuname: z.string().trim().min(1, "게시판 이름을 입력해 주세요."),
})

export const soopSettingsInputSchema = z.object({
  boardUrl: z
    .string()
    .trim()
    .min(1, "SOOP 게시판 링크를 입력해 주세요.")
    .refine(
      (value) => getSoopBoardSettings(value) !== null,
      "SOOP 게시판 링크를 입력해 주세요."
    ),
})

export function getNaverCafeUrlFromId(clubId: string) {
  return `https://cafe.naver.com/f-e/cafes/${clubId}/menus/0?viewType=L`
}

export function getSoopBoardUrlFromIds(userid: string, boardId: string) {
  return `https://www.sooplive.com/station/${userid}/board/${boardId}`
}
