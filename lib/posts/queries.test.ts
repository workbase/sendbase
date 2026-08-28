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
          external_post_id: null,
          external_publish_id: "publish-id",
          external_url: null,
          publicly_available: null,
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
          external_post_id: "123",
          external_publish_id: "publish-id",
          external_url: "https://www.tiktok.com/@sendbase/post/123",
          publicly_available: true,
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
        {
          platform: "tiktok",
          external_post_id: null,
          external_publish_id: "publish-id",
          external_url: null,
          publicly_available: null,
          status: "failed",
        },
      ])
    )

    expect(post.processingDestinations).toEqual([])
  })

  it("keeps the temporary TikTok link after publishing completes without a public post ID", () => {
    const post = mapPostHistoryRow(
      createPostRow([
        {
          platform: "tiktok",
          external_post_id: null,
          external_publish_id: "publish-id",
          external_url: null,
          publicly_available: null,
          status: "published",
        },
      ])
    )

    expect(post.processingDestinations).toEqual(["tiktok"])
    expect(post.links).toEqual([])
  })

  it("builds a TikTok player link from a public post ID", () => {
    const post = mapPostHistoryRow(
      createPostRow([
        {
          platform: "tiktok",
          external_post_id: "9223372036854775000",
          external_publish_id: "publish-id",
          external_url: null,
          publicly_available: true,
          status: "published",
        },
      ])
    )

    expect(post.processingDestinations).toEqual([])
    expect(post.links).toEqual([
      {
        platform: "tiktok",
        url: "https://www.tiktok.com/player/v1/9223372036854775000",
      },
    ])
  })

  it("does not expose a TikTok link after the post stops being public", () => {
    const post = mapPostHistoryRow(
      createPostRow([
        {
          platform: "tiktok",
          external_post_id: "123",
          external_publish_id: "publish-id",
          external_url: "https://www.tiktok.com/player/v1/123",
          publicly_available: false,
          status: "published",
        },
      ])
    )

    expect(post.processingDestinations).toEqual([])
    expect(post.links).toEqual([])
  })
})
