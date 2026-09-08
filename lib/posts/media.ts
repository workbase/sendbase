import "server-only"

import { POST_IMAGE_MAX_BYTES, isPostImageMimeType } from "./image-constraints"

const POST_MEDIA_PUBLIC_PATH = "/storage/v1/object/public/post-media/"
const DOWNLOAD_TIMEOUT_MS = 10_000

function postMediaOrigin() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!value)
    throw new Error("NEXT_PUBLIC_SUPABASE_URL 환경 변수가 필요합니다.")
  return new URL(value).origin
}

export function ownedPostMediaPath(userId: string, imageUrl: string) {
  try {
    const url = new URL(imageUrl)
    if (url.protocol !== "https:" || url.origin !== postMediaOrigin()) {
      return null
    }
    if (!url.pathname.startsWith(POST_MEDIA_PUBLIC_PATH)) return null
    if (url.search || url.hash) return null

    const path = decodeURIComponent(
      url.pathname.slice(POST_MEDIA_PUBLIC_PATH.length)
    )
    const segments = path.split("/")
    if (
      segments.length < 2 ||
      segments[0] !== userId ||
      segments.some(
        (segment) => !segment || segment === "." || segment === ".."
      )
    ) {
      return null
    }
    return path
  } catch {
    return null
  }
}

export function assertOwnedPostMediaUrls(
  userId: string,
  imageUrls: readonly string[]
) {
  if (imageUrls.some((imageUrl) => !ownedPostMediaPath(userId, imageUrl))) {
    throw new Error("본인이 업로드한 이미지만 게시할 수 있습니다.")
  }
}

function imageExtension(contentType: string) {
  switch (contentType) {
    case "image/jpeg":
      return "jpg"
    case "image/png":
      return "png"
    case "image/webp":
      return "webp"
    case "image/gif":
      return "gif"
    default:
      throw new Error("지원하지 않는 이미지 형식입니다.")
  }
}

export async function downloadOwnedPostImage(userId: string, imageUrl: string) {
  if (!ownedPostMediaPath(userId, imageUrl)) {
    throw new Error("본인이 업로드한 이미지만 게시할 수 있습니다.")
  }

  const response = await fetch(imageUrl, {
    redirect: "manual",
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    cache: "no-store",
  })
  if (!response.ok || response.headers.has("location")) {
    throw new Error("첨부할 이미지를 불러오지 못했습니다.")
  }

  const contentType =
    response.headers
      .get("content-type")
      ?.split(";", 1)[0]
      ?.trim()
      .toLowerCase() ?? ""
  if (!isPostImageMimeType(contentType)) {
    throw new Error("첨부 파일이 지원하는 이미지 형식이 아닙니다.")
  }

  const contentLength = Number(response.headers.get("content-length"))
  if (Number.isFinite(contentLength) && contentLength > POST_IMAGE_MAX_BYTES) {
    throw new Error("첨부 이미지가 10MB를 초과합니다.")
  }
  if (!response.body) throw new Error("첨부 이미지 응답이 비어 있습니다.")

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let receivedBytes = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      receivedBytes += value.byteLength
      if (receivedBytes > POST_IMAGE_MAX_BYTES) {
        await reader.cancel()
        throw new Error("첨부 이미지가 10MB를 초과합니다.")
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  return {
    data: Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))),
    contentType,
    extension: imageExtension(contentType),
  }
}
