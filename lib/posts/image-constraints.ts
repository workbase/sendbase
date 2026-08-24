export const POST_IMAGE_MAX_BYTES = 10 * 1024 * 1024

export const postImageMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const

const postImageMimeTypeSet = new Set<string>(postImageMimeTypes)

export const postImageAccept = postImageMimeTypes.join(",")

export function isPostImageMimeType(value: string) {
  return postImageMimeTypeSet.has(value)
}
