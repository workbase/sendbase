import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { encryptToken } from "@/lib/auth/crypto"
import { appOrigin } from "@/lib/auth/providers"
import { getCurrentUser } from "@/lib/auth/session"
import { queryTikTokCreatorInfoWithToken } from "@/lib/platforms/tiktok/client"
import { exchangeTikTokAuthorizationCode } from "@/lib/platforms/tiktok/oauth"
import { createAdminClient } from "@/lib/supabase/admin"

type ApiPlatform = "threads" | "x" | "discord" | "tiktok"
type OAuthTokens = {
  accessToken: string
  refreshToken: string | null
  expiresIn: number | null
  raw: Record<string, unknown>
}
type PlatformAccount = {
  id: string | null
  name: string
  settings: Record<string, unknown>
  webhookUrl: string | null
}

function isApiPlatform(value: string): value is ApiPlatform {
  return (
    value === "threads" ||
    value === "x" ||
    value === "discord" ||
    value === "tiktok"
  )
}

function required(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} 환경 변수가 필요합니다.`)
  return value
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {}
}

function value(recordValue: Record<string, unknown>, key: string) {
  const candidate = recordValue[key]
  return typeof candidate === "string" ? candidate : null
}

function verifiedDiscordWebhookUrl(candidate: string | null) {
  if (!candidate) return null
  try {
    const url = new URL(candidate)
    if (
      url.protocol !== "https:" ||
      url.origin !== "https://discord.com" ||
      !/^\/api\/webhooks\/\d+\/[^/]+$/.test(url.pathname) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      return null
    }
    return url.toString()
  } catch {
    return null
  }
}

async function exchange(
  platform: ApiPlatform,
  code: string,
  verifier: string | null
) {
  const redirectUri = `${appOrigin()}/api/connect/${platform}/callback`
  let url: string
  let body: URLSearchParams
  let authorization: string | null = null

  if (platform === "tiktok") {
    const tokens = await exchangeTikTokAuthorizationCode(code, redirectUri)
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      raw: {
        open_id: tokens.openId,
        scopes: tokens.scopes,
        refresh_expires_in: tokens.refreshExpiresIn,
      },
    } satisfies OAuthTokens
  }
  if (platform === "threads") {
    url = "https://graph.threads.net/oauth/access_token"
    body = new URLSearchParams({
      client_id: required("THREADS_CLIENT_ID"),
      client_secret: required("THREADS_CLIENT_SECRET"),
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    })
  } else if (platform === "x") {
    if (!verifier) throw new Error("X PKCE 검증 정보가 없습니다.")
    url = "https://api.x.com/2/oauth2/token"
    body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
      client_id: required("X_CLIENT_ID"),
    })
    const secret = process.env.X_CLIENT_SECRET
    if (secret) {
      authorization = `Basic ${Buffer.from(`${required("X_CLIENT_ID")}:${secret}`).toString("base64")}`
    }
  } else {
    url = "https://discord.com/api/v10/oauth2/token"
    body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: required("DISCORD_CLIENT_ID"),
      client_secret: required("DISCORD_CLIENT_SECRET"),
    })
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...(authorization ? { Authorization: authorization } : {}),
    },
    body,
    cache: "no-store",
  })
  const json: unknown = await response.json()
  const root = record(json)
  if (!response.ok)
    throw new Error(
      value(root, "error_description") ??
        value(root, "message") ??
        "토큰 발급에 실패했습니다."
    )
  const accessToken = value(root, "access_token")
  if (!accessToken) throw new Error("액세스 토큰이 없습니다.")
  const expires = root.expires_in
  return {
    accessToken,
    refreshToken: value(root, "refresh_token"),
    expiresIn: typeof expires === "number" ? expires : null,
    raw: root,
  } satisfies OAuthTokens
}

async function profile(
  platform: ApiPlatform,
  tokens: OAuthTokens
): Promise<PlatformAccount> {
  if (platform === "tiktok") {
    const creator = await queryTikTokCreatorInfoWithToken(tokens.accessToken)
    return {
      id: value(tokens.raw, "open_id"),
      name: creator.creatorNickname,
      settings: {
        scopes: Array.isArray(tokens.raw.scopes) ? tokens.raw.scopes : [],
        refreshExpiresAt:
          typeof tokens.raw.refresh_expires_in === "number"
            ? new Date(
                Date.now() + tokens.raw.refresh_expires_in * 1000
              ).toISOString()
            : null,
      },
      webhookUrl: null,
    }
  }
  if (platform === "discord") {
    const webhook = record(tokens.raw.webhook)
    const name = value(webhook, "name") ?? "Discord 채널"
    const webhookUrl = verifiedDiscordWebhookUrl(value(webhook, "url"))
    if (!webhookUrl) throw new Error("Discord 웹훅 주소가 올바르지 않습니다.")
    return {
      id: value(webhook, "id"),
      name,
      settings: {},
      webhookUrl,
    }
  }

  const url =
    platform === "threads"
      ? "https://graph.threads.net/v1.0/me?fields=id,username"
      : "https://api.x.com/2/users/me?user.fields=profile_image_url"
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${tokens.accessToken}` },
    cache: "no-store",
  })
  const json: unknown = await response.json()
  const root = record(json)
  if (!response.ok) throw new Error("플랫폼 프로필을 가져오지 못했습니다.")
  const source = platform === "x" ? record(root.data) : root
  return {
    id: value(source, "id"),
    name: value(source, "username") ?? value(source, "name") ?? platform,
    settings: {},
    webhookUrl: null,
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ platform: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.redirect(appOrigin())
  const { platform } = await context.params
  if (!isApiPlatform(platform)) {
    return NextResponse.json(
      { message: "지원하지 않는 플랫폼입니다." },
      { status: 404 }
    )
  }
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const cookieStore = await cookies()
  const rawCookie = cookieStore.get(`connect_state_${platform}`)?.value
  cookieStore.delete(`connect_state_${platform}`)

  try {
    const saved = rawCookie
      ? (JSON.parse(rawCookie) as { state?: string; verifier?: string | null })
      : {}
    if (!code || !state || state !== saved.state)
      throw new Error("플랫폼 연결 요청이 만료되었습니다.")
    const tokens = await exchange(platform, code, saved.verifier ?? null)
    if (platform === "threads") {
      const longLivedUrl = new URL("https://graph.threads.net/access_token")
      longLivedUrl.searchParams.set("grant_type", "th_exchange_token")
      longLivedUrl.searchParams.set(
        "client_secret",
        required("THREADS_CLIENT_SECRET")
      )
      longLivedUrl.searchParams.set("access_token", tokens.accessToken)
      const longLivedResponse = await fetch(longLivedUrl, { cache: "no-store" })
      const longLivedJson: unknown = await longLivedResponse.json()
      const longLived = record(longLivedJson)
      if (!longLivedResponse.ok) {
        throw new Error(
          value(record(longLived.error), "message") ??
            "Threads 장기 토큰 발급에 실패했습니다."
        )
      }
      const exchangedToken = value(longLived, "access_token")
      if (!exchangedToken) throw new Error("Threads 장기 토큰이 없습니다.")
      tokens.accessToken = exchangedToken
      tokens.expiresIn =
        typeof longLived.expires_in === "number" ? longLived.expires_in : null
    }
    const account = await profile(platform, tokens)
    if (!account.id) throw new Error("플랫폼 계정 ID가 없습니다.")
    const supabase = createAdminClient()
    let connectionSettings = account.settings
    if (platform === "x") {
      const { data: existingConnection, error: existingConnectionError } =
        await supabase
          .from("platform_connections")
          .select("settings")
          .eq("user_id", user.id)
          .eq("platform", "x")
          .maybeSingle()
      if (existingConnectionError)
        throw new Error(existingConnectionError.message)
      connectionSettings = {
        ...record(existingConnection?.settings),
        ...account.settings,
      }
    }
    const { error } = await supabase.from("platform_connections").upsert(
      {
        user_id: user.id,
        platform,
        external_account_id: account.id,
        display_name: account.name,
        access_token_encrypted: encryptToken(tokens.accessToken),
        refresh_token_encrypted: tokens.refreshToken
          ? encryptToken(tokens.refreshToken)
          : null,
        expires_at: tokens.expiresIn
          ? new Date(Date.now() + tokens.expiresIn * 1000).toISOString()
          : null,
        webhook_url_encrypted: account.webhookUrl
          ? encryptToken(account.webhookUrl)
          : null,
        settings: connectionSettings,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,platform" }
    )
    if (error) throw new Error(error.message)
    return NextResponse.redirect(
      `${appOrigin()}/settings?connected=${platform}`
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "플랫폼 연결에 실패했습니다."
    return NextResponse.redirect(
      `${appOrigin()}/settings?error=${encodeURIComponent(message)}`
    )
  }
}
