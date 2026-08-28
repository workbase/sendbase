import { describe, expect, it } from "vitest"

import { mapTikTokPhotoPostRequest } from "./publish"
import type { TikTokPhotoPublishOptions } from "./schema"

const options: TikTokPhotoPublishOptions = {
  title: "제목",
  description: "원문",
  privacyLevel: "PUBLIC_TO_EVERYONE",
  allowComment: true,
  autoAddMusic: false,
  brandContent: false,
  brandOrganic: false,
  isAigc: false,
  photoCoverIndex: 1,
  musicUsageAccepted: true,
  brandedContentPolicyAccepted: false,
}

describe("mapTikTokPhotoPostRequest", () => {
  it("maps explicit booleans, image order, and cover index", () => {
    const request = mapTikTokPhotoPostRequest(options, ["first", "second"])
    expect(request).toMatchObject({
      media_type: "PHOTO",
      post_mode: "DIRECT_POST",
      post_info: {
        title: "제목",
        description: "원문",
        disable_comment: false,
        auto_add_music: false,
        brand_content_toggle: false,
        brand_organic_toggle: false,
      },
      source_info: {
        photo_images: ["first", "second"],
        photo_cover_index: 1,
      },
      is_aigc: false,
    })
  })
})
