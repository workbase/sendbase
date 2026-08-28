import { NextResponse } from "next/server"
import { z } from "zod"

import {
  reconcileTikTokPublishStatus,
  webhookEventKey,
  webhookStatusUpdate,
} from "@/lib/platforms/tiktok/status"
import { verifyTikTokWebhookSignature } from "@/lib/platforms/tiktok/webhook"

const supportedEvents = new Set([
  "post.publish.complete",
  "post.publish.failed",
  "post.publish.publicly_available",
  "post.publish.no_longer_publicaly_available",
])

const webhookSchema = z.object({
  client_key: z.string(),
  event: z.string(),
  content: z.string(),
})

const contentSchema = z.object({
  publish_id: z.string().min(1),
  reason: z.string().nullable().optional(),
  post_id: z.union([z.string(), z.number()]).nullable().optional(),
})

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET
  const clientKey = process.env.TIKTOK_CLIENT_KEY
  if (!clientSecret || !clientKey) {
    return NextResponse.json(
      { message: "Webhook is not configured." },
      { status: 503 }
    )
  }
  if (
    !verifyTikTokWebhookSignature({
      rawBody,
      signatureHeader: request.headers.get("TikTok-Signature"),
      clientSecret,
    })
  ) {
    return NextResponse.json({ message: "Invalid signature." }, { status: 401 })
  }

  const parsed = webhookSchema.safeParse(parseJson(rawBody))
  if (!parsed.success || parsed.data.client_key !== clientKey) {
    return NextResponse.json(
      { message: "Invalid webhook payload." },
      { status: 400 }
    )
  }
  if (!supportedEvents.has(parsed.data.event)) {
    return NextResponse.json({ ok: true })
  }
  const content = contentSchema.safeParse(parseJson(parsed.data.content))
  if (!content.success) {
    return NextResponse.json(
      { message: "Invalid webhook content." },
      { status: 400 }
    )
  }

  const result = await reconcileTikTokPublishStatus(
    webhookStatusUpdate({
      event: parsed.data.event,
      publishId: content.data.publish_id,
      reason: content.data.reason ?? null,
      postId:
        parsed.data.content.match(/"post_id"\s*:\s*"?(\d+)"?/)?.[1] ??
        (content.data.post_id === null || content.data.post_id === undefined
          ? null
          : String(content.data.post_id)),
      eventKey: webhookEventKey(rawBody),
    })
  )
  if (result === "not_found") {
    return NextResponse.json(
      { message: "Publish destination is not ready." },
      { status: 503 }
    )
  }
  return NextResponse.json({ ok: true })
}
