import "server-only"

import sharp from "sharp"

const ORIGINAL_MAX_WIDTH = 1600
const THUMBNAIL_MAX_WIDTH = 640

export async function optimizePostImage(input: Buffer) {
  const original = sharp(input, { animated: true })
    .rotate()
    .resize({
      width: ORIGINAL_MAX_WIDTH,
      withoutEnlargement: true,
      fit: "inside",
    })
    .webp({ quality: 82, effort: 4 })

  const thumbnail = sharp(input, { animated: true })
    .rotate()
    .resize({
      width: THUMBNAIL_MAX_WIDTH,
      withoutEnlargement: true,
      fit: "inside",
    })
    .webp({ quality: 72, effort: 4 })

  const [originalResult, thumbnailResult] = await Promise.all([
    original.toBuffer({ resolveWithObject: true }),
    thumbnail.toBuffer(),
  ])
  const { width, height } = originalResult.info
  if (!width || !height) throw new Error("이미지 크기를 확인하지 못했습니다.")

  return {
    original: originalResult.data,
    thumbnail: thumbnailResult,
    width,
    height,
  }
}
