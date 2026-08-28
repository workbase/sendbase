import "server-only"

import { withTikTokAccessToken } from "@/lib/platforms/tiktok/oauth"
import {
  tiktokCreatorInfoSchema,
  tiktokPrivacyLevelSchema,
  type TikTokCreatorInfo,
} from "@/lib/platforms/tiktok/schema"

const API_ORIGIN = "https://open.tiktokapis.com"
const API_OPERATIONS: Record<string, string> = {
  "/v2/post/publish/creator_info/query/": "query-creator-info",
  "/v2/post/publish/content/init/": "initialize-photo-post",
  "/v2/post/publish/status/fetch/": "fetch-publish-status",
}

type TikTokRequestContext = {
  destinationId?: string
}

export class TikTokApiError extends Error {
  readonly code: string
  readonly logId: string | null
  readonly status: number

  constructor(
    code: string,
    message: string,
    status: number,
    logId: string | null
  ) {
    super(message)
    this.name = "TikTokApiError"
    this.code = code
    this.logId = logId
    this.status = status
  }
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {}
}

function safeTikTokMessage(code: string) {
  const messages: Record<string, string> = {
    access_token_invalid:
      "TikTok 연결이 만료되었습니다. 계정을 다시 연결해 주세요.",
    scope_not_authorized:
      "TikTok 게시 권한이 없습니다. 계정을 다시 연결해 주세요.",
    rate_limit_exceeded: "TikTok 요청이 많습니다. 잠시 후 다시 시도해 주세요.",
    url_ownership_unverified: "TikTok 미디어 URL 인증 설정을 확인해 주세요.",
    invalid_param: "TikTok 게시 설정 또는 이미지를 확인해 주세요.",
    spam_risk_too_many_posts: "TikTok의 24시간 게시 한도에 도달했습니다.",
    spam_risk_user_banned_from_posting:
      "현재 TikTok 계정에서 게시할 수 없습니다.",
    auth_removed: "TikTok 연결이 해제되었습니다. 계정을 다시 연결해 주세요.",
  }
  return messages[code] ?? "TikTok 요청을 완료하지 못했습니다."
}

function operationForPath(path: string) {
  return API_OPERATIONS[path] ?? path
}

async function requestWithToken(
  accessToken: string,
  path: string,
  body: Record<string, unknown>,
  context?: TikTokRequestContext
): Promise<Record<string, unknown>> {
  const response = await fetch(`${API_ORIGIN}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  })
  const rawResponse = await response.text()
  let json: unknown = {}
  try {
    json = JSON.parse(rawResponse)
  } catch {
    json = {}
  }
  const root = record(json)
  const apiError = record(root.error)
  const code =
    typeof apiError.code === "string" ? apiError.code : "internal_error"
  const logId = typeof apiError.log_id === "string" ? apiError.log_id : null
  const ok = response.ok && code === "ok"
  console.info("[publish][api-response]", {
    platform: "tiktok",
    operation: operationForPath(path),
    destinationId: context?.destinationId ?? null,
    status: response.status,
    statusText: response.statusText,
    ok,
    response: { code, logId },
  })
  if (!ok) {
    throw new TikTokApiError(
      code,
      safeTikTokMessage(code),
      response.status,
      logId
    )
  }
  return { ...record(root.data), __rawResponse: rawResponse }
}

export function isTikTokInvalidToken(error: unknown) {
  return (
    error instanceof TikTokApiError && error.code === "access_token_invalid"
  )
}

export async function queryTikTokCreatorInfoWithToken(
  accessToken: string
): Promise<TikTokCreatorInfo> {
  const data = await requestWithToken(
    accessToken,
    "/v2/post/publish/creator_info/query/",
    {}
  )
  const privacyLevelOptions = Array.isArray(data.privacy_level_options)
    ? data.privacy_level_options.flatMap((value) => {
        const parsed = tiktokPrivacyLevelSchema.safeParse(value)
        return parsed.success ? [parsed.data] : []
      })
    : []
  const parsed = tiktokCreatorInfoSchema.safeParse({
    creatorNickname: data.creator_nickname,
    privacyLevelOptions,
    commentDisabled: data.comment_disabled,
  })
  if (!parsed.success) {
    throw new Error("TikTok 계정의 게시 가능 정보를 확인하지 못했습니다.")
  }
  return parsed.data
}

export function queryTikTokCreatorInfo(userId: string) {
  return withTikTokAccessToken(
    userId,
    queryTikTokCreatorInfoWithToken,
    isTikTokInvalidToken
  )
}

export function tikTokRequest<T>(
  userId: string,
  path: string,
  body: Record<string, unknown>,
  map: (data: Record<string, unknown>) => T,
  context?: TikTokRequestContext
) {
  return withTikTokAccessToken(
    userId,
    async (accessToken) =>
      map(await requestWithToken(accessToken, path, body, context)),
    isTikTokInvalidToken
  )
}
