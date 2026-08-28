import "server-only"

import { tikTokRequest, TikTokApiError } from "@/lib/platforms/tiktok/client"
import type { TikTokPhotoPublishOptions } from "@/lib/platforms/tiktok/schema"

export type TikTokPhotoPostRequest = {
  media_type: "PHOTO"
  post_mode: "DIRECT_POST"
  post_info: {
    title: string
    description: string
    privacy_level: TikTokPhotoPublishOptions["privacyLevel"]
    disable_comment: boolean
    auto_add_music: boolean
    brand_content_toggle: boolean
    brand_organic_toggle: boolean
  }
  source_info: {
    source: "PULL_FROM_URL"
    photo_images: string[]
    photo_cover_index: number
  }
  is_aigc: boolean
}

export function mapTikTokPhotoPostRequest(
  options: TikTokPhotoPublishOptions,
  photoImages: string[]
): TikTokPhotoPostRequest {
  return {
    media_type: "PHOTO",
    post_mode: "DIRECT_POST",
    post_info: {
      title: options.title,
      description: options.description,
      privacy_level: options.privacyLevel,
      disable_comment: !options.allowComment,
      auto_add_music: options.autoAddMusic,
      brand_content_toggle: options.brandContent,
      brand_organic_toggle: options.brandOrganic,
    },
    source_info: {
      source: "PULL_FROM_URL",
      photo_images: photoImages,
      photo_cover_index: options.photoCoverIndex,
    },
    is_aigc: options.isAigc,
  }
}

export async function initializeTikTokPhotoPost(
  userId: string,
  options: TikTokPhotoPublishOptions,
  photoImages: string[],
  destinationId?: string
) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await tikTokRequest(
        userId,
        "/v2/post/publish/content/init/",
        mapTikTokPhotoPostRequest(options, photoImages),
        (data) => {
          const publishId = data.publish_id
          if (typeof publishId !== "string" || !publishId) {
            throw new Error("TikTok 게시 추적 ID를 받지 못했습니다.")
          }
          return { publishId }
        },
        { destinationId }
      )
    } catch (error) {
      const retryable =
        error instanceof TikTokApiError &&
        (error.status === 429 ||
          error.status >= 500 ||
          error.code === "internal_error")
      if (!retryable || attempt === 1) throw error
      await new Promise((resolve) => setTimeout(resolve, 2_000))
    }
  }
  throw new Error("TikTok 게시 요청을 초기화하지 못했습니다.")
}
