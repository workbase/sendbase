import "server-only"

import { createHash } from "node:crypto"

import { tikTokRequest, TikTokApiError } from "@/lib/platforms/tiktok/client"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Database } from "@/lib/database.types"

type DestinationStatus = Database["public"]["Enums"]["destination_status"]

const POLL_DELAYS_SECONDS = [15, 30, 60, 120, 300, 600] as const

export type TikTokStatusUpdate = {
  publishId: string
  providerStatus: string
  destinationStatus: DestinationStatus
  failReason: string | null
  publicPostId: string | null
  publiclyAvailable: boolean | null
  nextPollAt: string | null
  eventKey?: string | null
  eventName?: string | null
}

function nextPollAt(attemptCount: number) {
  const delay =
    POLL_DELAYS_SECONDS[Math.min(attemptCount, POLL_DELAYS_SECONDS.length - 1)]
  return new Date(Date.now() + delay * 1000).toISOString()
}

function stringValue(value: Record<string, unknown>, key: string) {
  return typeof value[key] === "string" ? value[key] : null
}

function publicPostId(data: Record<string, unknown>) {
  const rawResponse = stringValue(data, "__rawResponse")
  const exactMatch = rawResponse?.match(
    /"publicaly_available_post_id"\s*:\s*\[\s*"?(\d+)"?/
  )
  if (exactMatch?.[1]) return exactMatch[1]
  const values = Array.isArray(data.publicaly_available_post_id)
    ? data.publicaly_available_post_id
    : []
  return values.length > 0 ? String(values[0]) : null
}

function failReasonMessage(reason: string) {
  const messages: Record<string, string> = {
    file_format_check_failed: "TikTok에서 지원하지 않는 이미지 형식입니다.",
    picture_size_check_failed: "TikTok 이미지 크기 조건을 충족하지 못했습니다.",
    photo_pull_failed: "TikTok이 공개 이미지 URL을 내려받지 못했습니다.",
    auth_removed: "TikTok 연결이 해제되었습니다. 계정을 다시 연결해 주세요.",
    spam_risk_too_many_posts: "TikTok의 24시간 게시 한도에 도달했습니다.",
    spam_risk_user_banned_from_posting:
      "현재 TikTok 계정에서 게시할 수 없습니다.",
    spam_risk_text: "TikTok 정책에 따라 게시물 텍스트를 게시할 수 없습니다.",
    spam_risk: "TikTok 정책에 따라 이 게시물을 게시할 수 없습니다.",
    internal: "TikTok 내부 처리 오류가 발생했습니다.",
  }
  return messages[reason] ?? "TikTok에서 게시물을 처리하지 못했습니다."
}

export async function fetchTikTokPublishStatus(
  userId: string,
  publishId: string,
  attemptCount: number,
  destinationId?: string,
  expectsPublicPost = false
): Promise<TikTokStatusUpdate> {
  return tikTokRequest(
    userId,
    "/v2/post/publish/status/fetch/",
    { publish_id: publishId },
    (data) =>
      normalizeTikTokPublishStatus(
        data,
        publishId,
        attemptCount,
        expectsPublicPost
      ),
    { destinationId }
  )
}

export function normalizeTikTokPublishStatus(
  data: Record<string, unknown>,
  publishId: string,
  attemptCount: number,
  expectsPublicPost = false
): TikTokStatusUpdate {
  const providerStatus = stringValue(data, "status")
  if (!providerStatus)
    throw new Error("TikTok 게시 상태를 확인하지 못했습니다.")
  const resolvedPublicPostId = publicPostId(data)
  if (providerStatus === "PUBLISH_COMPLETE") {
    return {
      publishId,
      providerStatus,
      destinationStatus: "published",
      failReason: null,
      publicPostId: resolvedPublicPostId,
      publiclyAvailable: resolvedPublicPostId ? true : null,
      nextPollAt:
        expectsPublicPost && !resolvedPublicPostId
          ? nextPollAt(attemptCount)
          : null,
    }
  }
  if (providerStatus === "FAILED") {
    const reason = stringValue(data, "fail_reason") ?? "unknown"
    const retryLimit = reason === "internal" ? 5 : 3
    if (
      (reason === "internal" || reason === "photo_pull_failed") &&
      attemptCount <= retryLimit
    ) {
      return {
        publishId,
        providerStatus: `FAILED_RETRYING:${reason}`,
        destinationStatus: "processing",
        failReason: null,
        publicPostId: resolvedPublicPostId,
        publiclyAvailable: resolvedPublicPostId ? true : null,
        nextPollAt: nextPollAt(attemptCount),
      }
    }
    return {
      publishId,
      providerStatus: `${providerStatus}:${reason}`,
      destinationStatus: "failed",
      failReason: failReasonMessage(reason),
      publicPostId: resolvedPublicPostId,
      publiclyAvailable: resolvedPublicPostId ? true : null,
      nextPollAt: null,
    }
  }
  const outsideDirectPost =
    providerStatus === "PROCESSING_UPLOAD" ||
    providerStatus === "SEND_TO_USER_INBOX"
  return {
    publishId,
    providerStatus: outsideDirectPost
      ? `${providerStatus}:MANUAL_REVIEW`
      : providerStatus,
    destinationStatus: "processing",
    failReason: null,
    publicPostId: resolvedPublicPostId,
    publiclyAvailable: resolvedPublicPostId ? true : null,
    nextPollAt: nextPollAt(attemptCount),
  }
}

export async function reconcileTikTokPublishStatus(update: TikTokStatusUpdate) {
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc(
    "reconcile_tiktok_publish_status",
    {
      p_publish_id: update.publishId,
      p_provider_status: update.providerStatus,
      p_destination_status: update.destinationStatus,
      p_fail_reason: update.failReason,
      p_public_post_id: update.publicPostId,
      p_publicly_available: update.publiclyAvailable,
      p_next_poll_at: update.nextPollAt,
      p_event_key: update.eventKey ?? null,
      p_event_name: update.eventName ?? null,
    }
  )
  if (error) throw new Error(error.message)
  return data
}

export function webhookEventKey(rawBody: string) {
  return createHash("sha256").update(rawBody).digest("hex")
}

export function webhookStatusUpdate(input: {
  event: string
  publishId: string
  reason: string | null
  postId: string | null
  eventKey: string
}): TikTokStatusUpdate {
  const base = {
    publishId: input.publishId,
    failReason: input.reason,
    publicPostId: input.postId,
    eventKey: input.eventKey,
    eventName: input.event,
    nextPollAt: null,
  }
  switch (input.event) {
    case "post.publish.complete":
      return {
        ...base,
        providerStatus: input.event,
        destinationStatus: "published",
        failReason: null,
        publiclyAvailable: input.postId ? true : null,
      }
    case "post.publish.failed":
      return {
        ...base,
        providerStatus: `${input.event}:${input.reason ?? "unknown"}`,
        destinationStatus: "failed",
        failReason: failReasonMessage(input.reason ?? "unknown"),
        publiclyAvailable: null,
      }
    case "post.publish.publicly_available":
      return {
        ...base,
        providerStatus: input.event,
        destinationStatus: "published",
        failReason: null,
        publiclyAvailable: true,
      }
    case "post.publish.no_longer_publicaly_available":
      return {
        ...base,
        providerStatus: input.event,
        destinationStatus: "published",
        failReason: null,
        publiclyAvailable: false,
      }
    default:
      throw new Error("지원하지 않는 TikTok 웹훅 이벤트입니다.")
  }
}

export function isRetryableTikTokStatusError(error: unknown) {
  return (
    error instanceof TikTokApiError &&
    (error.status === 429 ||
      error.status >= 500 ||
      error.code === "internal_error")
  )
}

export function retryPollAt(attemptCount: number) {
  return nextPollAt(attemptCount)
}
