import { NextResponse } from "next/server"

import { TikTokApiError } from "@/lib/platforms/tiktok/client"
import {
  fetchTikTokPublishStatus,
  isRetryableTikTokStatusError,
  reconcileTikTokPublishStatus,
  retryPollAt,
} from "@/lib/platforms/tiktok/status"
import { createAdminClient } from "@/lib/supabase/admin"

type DueDestination = {
  id: string
  external_publish_id: string
  poll_attempt_count: number
  publish_options: unknown
  posts: { user_id: string } | null
}

function expectsPublicPost(value: unknown) {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    (value as Record<string, unknown>).privacyLevel === "PUBLIC_TO_EVERYONE"
  )
}

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET
  return Boolean(
    secret && request.headers.get("authorization") === `Bearer ${secret}`
  )
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const supabase = createAdminClient()
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from("post_destinations")
    .select(
      "id, external_publish_id, poll_attempt_count, publish_options, posts(user_id)"
    )
    .eq("platform", "tiktok")
    .not("next_poll_at", "is", null)
    .lte("next_poll_at", now)
    .order("next_poll_at", { ascending: true })
    .limit(25)
  if (error) throw new Error(error.message)

  let processed = 0
  const requestsByUser = new Map<string, number>()
  for (const destination of (data ?? []) as unknown as DueDestination[]) {
    if (!destination.external_publish_id || !destination.posts?.user_id)
      continue
    const userRequestCount = requestsByUser.get(destination.posts.user_id) ?? 0
    if (userRequestCount >= 7) continue
    requestsByUser.set(destination.posts.user_id, userRequestCount + 1)
    const nextAttempt = destination.poll_attempt_count + 1
    const { data: claimed, error: claimError } = await supabase
      .from("post_destinations")
      .update({
        last_polled_at: now,
        poll_attempt_count: nextAttempt,
        next_poll_at: retryPollAt(nextAttempt),
      })
      .eq("id", destination.id)
      .eq("poll_attempt_count", destination.poll_attempt_count)
      .select("id")
      .maybeSingle()
    if (claimError) throw new Error(claimError.message)
    if (!claimed) continue

    try {
      const update = await fetchTikTokPublishStatus(
        destination.posts.user_id,
        destination.external_publish_id,
        nextAttempt,
        destination.id,
        expectsPublicPost(destination.publish_options)
      )
      await reconcileTikTokPublishStatus(update)
      if (update.providerStatus === "FAILED:auth_removed") {
        await supabase
          .from("platform_connections")
          .delete()
          .eq("user_id", destination.posts.user_id)
          .eq("platform", "tiktok")
      }
    } catch (pollError) {
      if (!isRetryableTikTokStatusError(pollError)) {
        const reason =
          pollError instanceof TikTokApiError
            ? pollError.code
            : "TikTok 게시 상태를 확인하지 못했습니다."
        await reconcileTikTokPublishStatus({
          publishId: destination.external_publish_id,
          providerStatus: "STATUS_FETCH_FAILED",
          destinationStatus: "failed",
          failReason: reason,
          publicPostId: null,
          publiclyAvailable: null,
          nextPollAt: null,
        })
      }
    }
    processed += 1
  }

  return NextResponse.json({ processed })
}

export const GET = POST
