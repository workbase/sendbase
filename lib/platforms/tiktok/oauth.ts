import "server-only"

import { decryptToken, encryptToken } from "@/lib/auth/crypto"
import { createAdminClient } from "@/lib/supabase/admin"

const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/"
const REVOKE_URL = "https://open.tiktokapis.com/v2/oauth/revoke/"

type TikTokTokenResponse = {
  accessToken: string
  refreshToken: string
  expiresIn: number
  refreshExpiresIn: number
  openId: string
  scopes: string[]
}

type TikTokConnection = {
  id: string
  accessToken: string
  refreshToken: string
  refreshTokenEncrypted: string
  expiresAt: string | null
  updatedAt: string
  settings: Record<string, unknown>
}

function required(name: "TIKTOK_CLIENT_KEY" | "TIKTOK_CLIENT_SECRET") {
  const value = process.env[name]
  if (!value) throw new Error(`${name} 환경 변수가 필요합니다.`)
  return value
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {}
}

function stringValue(value: Record<string, unknown>, key: string) {
  return typeof value[key] === "string" ? value[key] : null
}

async function tokenRequest(
  body: URLSearchParams
): Promise<TikTokTokenResponse> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  })
  const json: unknown = await response.json().catch(() => ({}))
  const root = record(json)
  const accessToken = stringValue(root, "access_token")
  const refreshToken = stringValue(root, "refresh_token")
  const openId = stringValue(root, "open_id")
  const expiresIn = root.expires_in
  const refreshExpiresIn = root.refresh_expires_in
  if (
    !response.ok ||
    !accessToken ||
    !refreshToken ||
    !openId ||
    typeof expiresIn !== "number" ||
    typeof refreshExpiresIn !== "number"
  ) {
    throw new Error(
      stringValue(root, "error_description") ??
        "TikTok 인증 토큰을 발급하지 못했습니다."
    )
  }
  return {
    accessToken,
    refreshToken,
    openId,
    expiresIn,
    refreshExpiresIn,
    scopes: (stringValue(root, "scope") ?? "")
      .split(",")
      .map((scope) => scope.trim())
      .filter(Boolean),
  }
}

export function createTikTokAuthorizeUrl(input: {
  redirectUri: string
  state: string
}) {
  const url = new URL("https://www.tiktok.com/v2/auth/authorize/")
  url.searchParams.set("client_key", required("TIKTOK_CLIENT_KEY"))
  url.searchParams.set("scope", "video.publish")
  url.searchParams.set("response_type", "code")
  url.searchParams.set("redirect_uri", input.redirectUri)
  url.searchParams.set("state", input.state)
  return url
}

export async function exchangeTikTokAuthorizationCode(
  code: string,
  redirectUri: string
) {
  const tokens = await tokenRequest(
    new URLSearchParams({
      client_key: required("TIKTOK_CLIENT_KEY"),
      client_secret: required("TIKTOK_CLIENT_SECRET"),
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    })
  )
  if (!tokens.scopes.includes("video.publish")) {
    throw new Error(
      "TikTok 게시 권한이 승인되지 않았습니다. 다시 연결해 주세요."
    )
  }
  return tokens
}

async function getTikTokConnection(userId: string): Promise<TikTokConnection> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("platform_connections")
    .select(
      "id, access_token_encrypted, refresh_token_encrypted, expires_at, settings, updated_at"
    )
    .eq("user_id", userId)
    .eq("platform", "tiktok")
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data?.access_token_encrypted || !data.refresh_token_encrypted) {
    throw new Error("설정에서 TikTok 계정을 먼저 연결해 주세요.")
  }
  const settings = record(data.settings)
  const scopes = Array.isArray(settings.scopes)
    ? settings.scopes.filter(
        (scope): scope is string => typeof scope === "string"
      )
    : []
  if (!scopes.includes("video.publish")) {
    throw new Error("TikTok 게시 권한이 없습니다. 계정을 다시 연결해 주세요.")
  }
  return {
    id: data.id,
    accessToken: decryptToken(data.access_token_encrypted),
    refreshToken: decryptToken(data.refresh_token_encrypted),
    refreshTokenEncrypted: data.refresh_token_encrypted,
    expiresAt: data.expires_at,
    updatedAt: data.updated_at,
    settings,
  }
}

async function refreshTikTokConnection(connection: TikTokConnection) {
  const supabase = createAdminClient()
  const claimedAt = new Date().toISOString()
  const { data: claim, error: claimError } = await supabase
    .from("platform_connections")
    .update({ updated_at: claimedAt })
    .eq("id", connection.id)
    .eq("updated_at", connection.updatedAt)
    .select("id")
    .maybeSingle()
  if (claimError) throw new Error(claimError.message)
  if (!claim) {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 250))
      const current = await getTikTokConnectionById(connection.id)
      if (current.refreshTokenEncrypted !== connection.refreshTokenEncrypted) {
        return current
      }
    }
    throw new Error(
      "TikTok 연결을 갱신하고 있습니다. 잠시 후 다시 시도해 주세요."
    )
  }

  const tokens = await tokenRequest(
    new URLSearchParams({
      client_key: required("TIKTOK_CLIENT_KEY"),
      client_secret: required("TIKTOK_CLIENT_SECRET"),
      grant_type: "refresh_token",
      refresh_token: connection.refreshToken,
    })
  )
  if (!tokens.scopes.includes("video.publish")) {
    throw new Error(
      "TikTok 게시 권한이 해제되었습니다. 계정을 다시 연결해 주세요."
    )
  }

  const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000).toISOString()
  const refreshedAt = new Date().toISOString()
  const accessTokenEncrypted = encryptToken(tokens.accessToken)
  const refreshTokenEncrypted = encryptToken(tokens.refreshToken)
  const { data, error } = await supabase
    .from("platform_connections")
    .update({
      access_token_encrypted: accessTokenEncrypted,
      refresh_token_encrypted: refreshTokenEncrypted,
      expires_at: expiresAt,
      settings: {
        ...connection.settings,
        scopes: tokens.scopes,
        refreshExpiresAt: new Date(
          Date.now() + tokens.refreshExpiresIn * 1000
        ).toISOString(),
      },
      updated_at: refreshedAt,
    })
    .eq("id", connection.id)
    .eq("updated_at", claimedAt)
    .select("id")
    .maybeSingle()
  if (error) throw new Error(error.message)

  if (!data) {
    return getTikTokConnectionById(connection.id)
  }
  return {
    ...connection,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    refreshTokenEncrypted,
    expiresAt,
    updatedAt: refreshedAt,
    settings: { ...connection.settings, scopes: tokens.scopes },
  }
}

async function getTikTokConnectionById(id: string): Promise<TikTokConnection> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("platform_connections")
    .select(
      "id, access_token_encrypted, refresh_token_encrypted, expires_at, settings, updated_at"
    )
    .eq("id", id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data?.access_token_encrypted || !data.refresh_token_encrypted) {
    throw new Error("TikTok 연결 정보를 갱신하지 못했습니다.")
  }
  return {
    id: data.id,
    accessToken: decryptToken(data.access_token_encrypted),
    refreshToken: decryptToken(data.refresh_token_encrypted),
    refreshTokenEncrypted: data.refresh_token_encrypted,
    expiresAt: data.expires_at,
    updatedAt: data.updated_at,
    settings: record(data.settings),
  }
}

export async function withTikTokAccessToken<T>(
  userId: string,
  operation: (accessToken: string) => Promise<T>,
  isInvalidToken: (error: unknown) => boolean
) {
  let connection = await getTikTokConnection(userId)
  const expiresSoon =
    !connection.expiresAt ||
    new Date(connection.expiresAt).getTime() <= Date.now() + 10 * 60 * 1000
  if (expiresSoon) connection = await refreshTikTokConnection(connection)

  try {
    return await operation(connection.accessToken)
  } catch (error) {
    if (!isInvalidToken(error)) throw error
    connection = await refreshTikTokConnection(connection)
    return operation(connection.accessToken)
  }
}

export async function revokeTikTokConnectionToken(accessToken: string) {
  const response = await fetch(REVOKE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: required("TIKTOK_CLIENT_KEY"),
      client_secret: required("TIKTOK_CLIENT_SECRET"),
      token: accessToken,
    }),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  })
  if (!response.ok) throw new Error("TikTok 연결 해제 요청에 실패했습니다.")
}

export async function getTikTokAccessTokenForDisconnect(userId: string) {
  return (await getTikTokConnection(userId)).accessToken
}
