import "server-only"

import sharp from "sharp"

import { createAdminClient } from "@/lib/supabase/admin"

const POST_MEDIA_BUCKET = "post-media"
const POST_MEDIA_PUBLIC_PATH = `/storage/v1/object/public/${POST_MEDIA_BUCKET}/`
const TIKTOK_MAX_BYTES = 20 * 1024 * 1024

type TikTokImageFormat = {
  contentType: "image/jpeg" | "image/webp"
  extension: "jpg" | "webp"
}

function supabaseMediaOrigin() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!value)
    throw new Error("NEXT_PUBLIC_SUPABASE_URL 환경 변수가 필요합니다.")
  return new URL(value).origin
}

export function tikTokMediaUrlPrefix() {
  const actual = `${supabaseMediaOrigin()}${POST_MEDIA_PUBLIC_PATH}`
  const verified = process.env.TIKTOK_MEDIA_URL_PREFIX
  if (!verified)
    throw new Error("TIKTOK_MEDIA_URL_PREFIX 환경 변수가 필요합니다.")
  const normalized = verified.endsWith("/") ? verified : `${verified}/`
  if (normalized !== actual) {
    throw new Error(
      "TikTok에 인증한 미디어 URL prefix가 Supabase Storage와 일치하지 않습니다."
    )
  }
  return normalized
}

export function ownedPostMediaPath(userId: string, imageUrl: string) {
  try {
    const url = new URL(imageUrl)
    if (url.protocol !== "https:" || url.origin !== supabaseMediaOrigin())
      return null
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

function derivativePath(
  sourcePath: string,
  extension: TikTokImageFormat["extension"]
) {
  return `${sourcePath.replace(/\.[^.]+$/, "")}-tiktok.${extension}`
}

export async function optimizeTikTokImage(input: Buffer) {
  const metadata = await sharp(input, { animated: false }).metadata()
  if (!metadata.width || !metadata.height) {
    throw new Error("TikTok 이미지 크기를 확인하지 못했습니다.")
  }
  const portrait = metadata.autoOrient.height > metadata.autoOrient.width
  const format: TikTokImageFormat = metadata.hasAlpha
    ? { contentType: "image/webp", extension: "webp" }
    : { contentType: "image/jpeg", extension: "jpg" }
  const pipeline = sharp(input, { animated: false })
    .rotate()
    .resize({
      width: portrait ? 1080 : 1920,
      height: portrait ? 1920 : 1080,
      fit: "inside",
      withoutEnlargement: true,
    })
  const result = await (
    format.extension === "webp"
      ? pipeline.webp({ quality: 88, effort: 5 })
      : pipeline.jpeg({
          quality: 88,
          progressive: true,
          chromaSubsampling: "4:4:4",
        })
  ).toBuffer({ resolveWithObject: true })
  if (
    !result.info.width ||
    !result.info.height ||
    result.data.byteLength > TIKTOK_MAX_BYTES
  ) {
    throw new Error("TikTok 이미지가 크기 제한을 초과합니다.")
  }
  if (
    result.info.width > 1920 ||
    result.info.height > 1920 ||
    (result.info.width > 1080 && result.info.height > 1080)
  ) {
    throw new Error("TikTok 이미지가 1080p 범위를 초과합니다.")
  }
  return {
    data: result.data,
    width: result.info.width,
    height: result.info.height,
    ...format,
  }
}

async function ensureTikTokImageUrl(userId: string, imageUrl: string) {
  const sourcePath = ownedPostMediaPath(userId, imageUrl)
  if (!sourcePath)
    throw new Error("본인이 업로드한 이미지만 TikTok에 게시할 수 있습니다.")
  const bucket = createAdminClient().storage.from(POST_MEDIA_BUCKET)
  const { data: source, error: downloadError } =
    await bucket.download(sourcePath)
  if (downloadError || !source) {
    throw new Error(
      `TikTok 이미지 원본을 찾지 못했습니다: ${downloadError?.message ?? "알 수 없는 오류"}`
    )
  }
  const encoded = await optimizeTikTokImage(
    Buffer.from(await source.arrayBuffer())
  )
  const path = derivativePath(sourcePath, encoded.extension)
  const { error: uploadError } = await bucket.upload(path, encoded.data, {
    contentType: encoded.contentType,
    cacheControl: "3600",
    upsert: true,
  })
  if (uploadError)
    throw new Error(
      `TikTok 이미지를 준비하지 못했습니다: ${uploadError.message}`
    )

  const publicUrl = bucket.getPublicUrl(path).data.publicUrl
  if (!publicUrl.startsWith(tikTokMediaUrlPrefix())) {
    throw new Error("TikTok 이미지 URL이 인증된 prefix 밖에 있습니다.")
  }
  return publicUrl
}

export async function prepareTikTokPhotoImages(
  userId: string,
  imageUrls: string[]
) {
  const prepared: string[] = []
  for (let index = 0; index < imageUrls.length; index += 4) {
    prepared.push(
      ...(await Promise.all(
        imageUrls
          .slice(index, index + 4)
          .map((url) => ensureTikTokImageUrl(userId, url))
      ))
    )
  }
  return prepared
}

export async function verifyTikTokPhotoImageUrls(imageUrls: string[]) {
  const prefix = tikTokMediaUrlPrefix()
  await Promise.all(
    imageUrls.map(async (imageUrl) => {
      if (!imageUrl.startsWith(prefix))
        throw new Error("TikTok 이미지 URL prefix가 올바르지 않습니다.")
      const response = await fetch(imageUrl, {
        method: "HEAD",
        redirect: "manual",
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
      })
      if (response.status !== 200 || response.headers.has("location")) {
        throw new Error("TikTok 이미지 공개 URL에 직접 접근할 수 없습니다.")
      }
      const contentType = response.headers.get("content-type")?.split(";", 1)[0]
      const contentLength = Number(response.headers.get("content-length"))
      if (contentType !== "image/jpeg" && contentType !== "image/webp") {
        throw new Error("TikTok 이미지는 JPEG 또는 WebP여야 합니다.")
      }
      if (Number.isFinite(contentLength) && contentLength > TIKTOK_MAX_BYTES) {
        throw new Error("TikTok 이미지가 20MB를 초과합니다.")
      }
    })
  )
}
