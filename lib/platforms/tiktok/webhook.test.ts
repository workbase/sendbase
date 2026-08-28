import { createHmac } from "node:crypto"
import { describe, expect, it } from "vitest"

import { verifyTikTokWebhookSignature } from "./webhook"

describe("verifyTikTokWebhookSignature", () => {
  const rawBody = '{"event":"post.publish.complete"}'
  const clientSecret = "secret"
  const timestamp = 1_700_000_000
  const signature = createHmac("sha256", clientSecret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex")

  it("accepts a valid current signature", () => {
    expect(
      verifyTikTokWebhookSignature({
        rawBody,
        clientSecret,
        signatureHeader: `t=${timestamp},s=${signature}`,
        now: timestamp,
      })
    ).toBe(true)
  })

  it("rejects invalid and stale signatures", () => {
    expect(
      verifyTikTokWebhookSignature({
        rawBody,
        clientSecret,
        signatureHeader: `t=${timestamp},s=${"0".repeat(64)}`,
        now: timestamp,
      })
    ).toBe(false)
    expect(
      verifyTikTokWebhookSignature({
        rawBody,
        clientSecret,
        signatureHeader: `t=${timestamp},s=${signature}`,
        now: timestamp + 301,
      })
    ).toBe(false)
  })
})
