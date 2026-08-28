import "server-only"

import { createHmac, timingSafeEqual } from "node:crypto"

const SIGNATURE_TOLERANCE_SECONDS = 5 * 60

export function verifyTikTokWebhookSignature(input: {
  rawBody: string
  signatureHeader: string | null
  clientSecret: string
  now?: number
}) {
  if (!input.signatureHeader) return false
  const parts = new Map(
    input.signatureHeader.split(",").flatMap((part) => {
      const [key, value] = part.trim().split("=", 2)
      return key && value ? [[key, value] as const] : []
    })
  )
  const timestamp = parts.get("t")
  const signature = parts.get("s")
  if (
    !timestamp ||
    !signature ||
    !/^\d+$/.test(timestamp) ||
    !/^[a-f\d]{64}$/i.test(signature)
  ) {
    return false
  }
  const now = input.now ?? Math.floor(Date.now() / 1000)
  if (Math.abs(now - Number(timestamp)) > SIGNATURE_TOLERANCE_SECONDS)
    return false
  const expected = createHmac("sha256", input.clientSecret)
    .update(`${timestamp}.${input.rawBody}`)
    .digest()
  const received = Buffer.from(signature, "hex")
  return (
    received.length === expected.length && timingSafeEqual(received, expected)
  )
}
