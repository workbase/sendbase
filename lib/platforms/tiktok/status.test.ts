import { describe, expect, it } from "vitest"

import { normalizeTikTokPublishStatus, webhookStatusUpdate } from "./status"

describe("TikTok status normalization", () => {
  it("keeps processing downloads non-terminal", () => {
    const update = normalizeTikTokPublishStatus(
      { status: "PROCESSING_DOWNLOAD" },
      "publish-id",
      0
    )
    expect(update.destinationStatus).toBe("processing")
    expect(update.nextPollAt).not.toBeNull()
  })

  it("preserves an exact int64 public post ID from the raw response", () => {
    const update = normalizeTikTokPublishStatus(
      {
        status: "PUBLISH_COMPLETE",
        publicaly_available_post_id: [9_223_372_036_854_775_000],
        __rawResponse:
          '{"data":{"status":"PUBLISH_COMPLETE","publicaly_available_post_id":[9223372036854775000]}}',
      },
      "publish-id",
      1
    )
    expect(update.destinationStatus).toBe("published")
    expect(update.publicPostId).toBe("9223372036854775000")
    expect(update.nextPollAt).toBeNull()
  })

  it("continues polling a public post until TikTok exposes its post ID", () => {
    const update = normalizeTikTokPublishStatus(
      { status: "PUBLISH_COMPLETE", publicaly_available_post_id: [] },
      "publish-id",
      1,
      true
    )

    expect(update.destinationStatus).toBe("published")
    expect(update.publicPostId).toBeNull()
    expect(update.nextPollAt).not.toBeNull()
  })

  it("retries transient provider failures before becoming terminal", () => {
    expect(
      normalizeTikTokPublishStatus(
        { status: "FAILED", fail_reason: "photo_pull_failed" },
        "publish-id",
        1
      ).destinationStatus
    ).toBe("processing")
    expect(
      normalizeTikTokPublishStatus(
        { status: "FAILED", fail_reason: "photo_pull_failed" },
        "publish-id",
        4
      ).destinationStatus
    ).toBe("failed")
  })

  it("maps content posting webhooks to terminal updates", () => {
    expect(
      webhookStatusUpdate({
        event: "post.publish.complete",
        publishId: "publish-id",
        reason: null,
        postId: null,
        eventKey: "event-key",
      }).destinationStatus
    ).toBe("published")
    expect(
      webhookStatusUpdate({
        event: "post.publish.failed",
        publishId: "publish-id",
        reason: "auth_removed",
        postId: null,
        eventKey: "event-key",
      })
    ).toMatchObject({
      destinationStatus: "failed",
      providerStatus: "post.publish.failed:auth_removed",
    })
  })

  it("marks a completed webhook post as public when TikTok includes its post ID", () => {
    expect(
      webhookStatusUpdate({
        event: "post.publish.complete",
        publishId: "publish-id",
        reason: null,
        postId: "123",
        eventKey: "event-key",
      })
    ).toMatchObject({
      publicPostId: "123",
      publiclyAvailable: true,
    })
  })
})
