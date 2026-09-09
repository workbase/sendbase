import "server-only"

import { imageUrlsFromHtml, replaceEditorImageUrls } from "@/lib/posts/content"
import { ownedPostMediaPath } from "@/lib/posts/media"
import { createAdminClient } from "@/lib/supabase/admin"

const ORIGINAL_MAX_WIDTH = 1600
const THUMBNAIL_MAX_WIDTH = 640
const MAX_OUTPUT_BYTES = 10 * 1024 * 1024
const POST_MEDIA_BUCKET = "post-media"

type CompatibleFormat = {
  contentType: "image/jpeg" | "image/png"
  extension: "jpg" | "png"
}

type PostMediaBucket = ReturnType<
  ReturnType<typeof createAdminClient>["storage"]["from"]
>

const jpegFormat: CompatibleFormat = {
  contentType: "image/jpeg",
  extension: "jpg",
}

const pngFormat: CompatibleFormat = {
  contentType: "image/png",
  extension: "png",
}

async function compatibleFormat(input: Buffer) {
  const { default: sharp } = await import("sharp")
  const metadata = await sharp(input, { animated: false }).metadata()
  return metadata.hasAlpha ? pngFormat : jpegFormat
}

async function imagePipeline(input: Buffer, width: number) {
  const { default: sharp } = await import("sharp")
  return sharp(input, { animated: false }).rotate().resize({
    width,
    withoutEnlargement: true,
    fit: "inside",
  })
}

async function encodeCompatibleImage(
  input: Buffer,
  width: number,
  format: CompatibleFormat,
  thumbnail = false
) {
  const pipeline = await imagePipeline(input, width)
  const encoded =
    format.extension === "png"
      ? pipeline.png({
          compressionLevel: 9,
          adaptiveFiltering: true,
          palette: true,
          quality: thumbnail ? 78 : 90,
          effort: 7,
        })
      : pipeline.jpeg({
          quality: thumbnail ? 76 : 86,
          progressive: true,
          chromaSubsampling: "4:4:4",
        })

  return encoded.toBuffer({ resolveWithObject: true })
}

export async function optimizePostImage(input: Buffer) {
  const format = await compatibleFormat(input)

  const [originalResult, thumbnailResult] = await Promise.all([
    encodeCompatibleImage(input, ORIGINAL_MAX_WIDTH, format),
    encodeCompatibleImage(input, THUMBNAIL_MAX_WIDTH, format, true),
  ])
  const { width, height } = originalResult.info
  if (!width || !height) throw new Error("이미지 크기를 확인하지 못했습니다.")
  if (
    originalResult.data.byteLength > MAX_OUTPUT_BYTES ||
    thumbnailResult.data.byteLength > MAX_OUTPUT_BYTES
  ) {
    throw new Error("변환된 이미지가 10MB를 초과합니다.")
  }

  return {
    original: originalResult.data,
    thumbnail: thumbnailResult.data,
    width,
    height,
    ...format,
  }
}

async function existingCompatiblePath(
  bucket: PostMediaBucket,
  sourcePath: string
) {
  const basePath = sourcePath.replace(/\.webp$/i, "")
  const paths = [`${basePath}-compatible.jpg`, `${basePath}-compatible.png`]
  const results = await Promise.all(paths.map((path) => bucket.exists(path)))
  const existingIndex = results.findIndex((result) => result.data === true)
  return existingIndex >= 0 ? paths[existingIndex] : null
}

async function ensureCompatibleImageUrl(
  bucket: PostMediaBucket,
  userId: string,
  imageUrl: string
) {
  const sourcePath = ownedPostMediaPath(userId, imageUrl)
  if (!sourcePath) {
    throw new Error("본인이 업로드한 이미지만 SOOP에 게시할 수 있습니다.")
  }
  if (!sourcePath.toLowerCase().endsWith(".webp")) {
    return imageUrl
  }

  const cachedPath = await existingCompatiblePath(bucket, sourcePath)
  if (cachedPath) return bucket.getPublicUrl(cachedPath).data.publicUrl

  const { data: source, error: downloadError } =
    await bucket.download(sourcePath)
  if (downloadError || !source) {
    throw new Error(
      `SOOP용 이미지 변환에 실패했습니다: ${downloadError?.message ?? "원본을 찾지 못했습니다."}`
    )
  }

  const input = Buffer.from(await source.arrayBuffer())
  const format = await compatibleFormat(input)
  const converted = await encodeCompatibleImage(
    input,
    ORIGINAL_MAX_WIDTH,
    format
  )
  if (converted.data.byteLength > MAX_OUTPUT_BYTES) {
    throw new Error("SOOP용 이미지가 10MB를 초과합니다.")
  }

  const compatiblePath = sourcePath.replace(
    /\.webp$/i,
    `-compatible.${format.extension}`
  )
  const { error: uploadError } = await bucket.upload(
    compatiblePath,
    converted.data,
    {
      contentType: format.contentType,
      cacheControl: "31536000",
      upsert: true,
    }
  )
  if (uploadError) {
    throw new Error(`SOOP용 이미지 변환에 실패했습니다: ${uploadError.message}`)
  }

  return bucket.getPublicUrl(compatiblePath).data.publicUrl
}

export async function preparePostHtmlForSoop(userId: string, html: string) {
  const imageUrls = imageUrlsFromHtml(html)
  if (imageUrls.length === 0) return html

  const bucket = createAdminClient().storage.from(POST_MEDIA_BUCKET)
  const compatibleUrls: string[] = []
  for (let index = 0; index < imageUrls.length; index += 4) {
    compatibleUrls.push(
      ...(await Promise.all(
        imageUrls
          .slice(index, index + 4)
          .map((imageUrl) => ensureCompatibleImageUrl(bucket, userId, imageUrl))
      ))
    )
  }
  const replacements = new Map(
    imageUrls.map((imageUrl, index) => [imageUrl, compatibleUrls[index]])
  )
  return replaceEditorImageUrls(html, replacements)
}
