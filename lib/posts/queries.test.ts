import { describe, expect, it } from "vitest"

import { mapPostHistoryRow, type PostHistoryRow } from "./queries"

function createPostRow(
  postDestinations: PostHistoryRow["post_destinations"]
): PostHistoryRow {
  return {
    id: "post-id",
    title: "TikTok 게시물",
    content_text: "본문",
    image_metadata: [],
    status: "publishing",
    updated_at: "2026-08-28T00:00:00.000Z",
    post_destinations: postDestinations,
  }
}

describe("mapPostHistoryRow", () => {
  it("marks a TikTok destination as processing before its URL is available", () => {
    const post = mapPostHistoryRow(
      createPostRow([
        {
          platform: "tiktok",
          external_url: null,
          status: "processing",
        },
      ])
    )

    expect(post.processingDestinations).toEqual(["tiktok"])
    expect(post.links).toEqual([])
  })

  it("uses the TikTok post URL once it is available", () => {
    const post = mapPostHistoryRow(
      createPostRow([
        {
          platform: "tiktok",
          external_url: "https://www.tiktok.com/@sendbase/post/123",
          status: "published",
        },
      ])
    )

    expect(post.processingDestinations).toEqual([])
    expect(post.links).toEqual([
      {
        platform: "tiktok",
        url: "https://www.tiktok.com/@sendbase/post/123",
      },
    ])
  })

  it("does not mark a failed TikTok destination as processing", () => {
    const post = mapPostHistoryRow(
      createPostRow([
        { platform: "tiktok", external_url: null, status: "failed" },
      ])
    )

    expect(post.processingDestinations).toEqual([])
  })
})
