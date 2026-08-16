import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { encryptToken } from "@/lib/auth/crypto"
import { appOrigin, getLoginProviderConfig, isLoginProvider } from "@/lib/auth/providers"
import { createSession } from "@/lib/auth/session"
import { createAdminClient } from "@/lib/supabase/admin"
import type { LoginProvider } from "@/lib/types"

type TokenSet = {
  accessToken: string
  refreshToken: string | null
  expiresIn: number | null
}

type SocialProfile = {
  id: string
  name: string
  avatarUrl: string | null
  raw: Record<string, unknown>
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {}
}

function firstString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value) return value
  }
  return null
}

async function exchangeCode(provider: LoginProvider, code: string, state: string) {
  const config = getLoginProviderConfig(provider)
  const redirectUri = `${appOrigin()}/api/auth/${provider}/callback`
  let response: Response

  if (provider === "soop") {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: redirectUri,
      code,
    })
    response = await fetch(config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    })
  } else {
    response = await fetch(config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grantType: "authorization_code",
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        code,
        ...(provider === "chzzk" ? { state } : {}),
      }),
      cache: "no-store",
    })
  }

  const json: unknown = await response.json()
  if (!response.ok) {
    throw new Error(firstString(asRecord(json), ["message", "error_description"]) ?? "토큰 발급에 실패했습니다.")
  }
  const root = asRecord(json)
  const source = provider === "cime" ? asRecord(root.content) : root
  const accessToken = firstString(source, ["accessToken", "access_token"])
  if (!accessToken) throw new Error("인증 응답에 액세스 토큰이 없습니다.")

  const expires = source.expiresIn ?? source.expires_in
  return {
    accessToken,
    refreshToken: firstString(source, ["refreshToken", "refresh_token"]),
    expiresIn:
      typeof expires === "number"
        ? expires
        : typeof expires === "string"
          ? Number(expires)
          : null,
  } satisfies TokenSet
}

async function fetchProfile(provider: LoginProvider, accessToken: string) {
  const config = getLoginProviderConfig(provider)
  const response =
    provider === "soop"
      ? await fetch(config.profileUrl, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ access_token: accessToken }),
          cache: "no-store",
        })
      : await fetch(config.profileUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        })
  const json: unknown = await response.json()
  if (!response.ok) throw new Error("소셜 프로필을 불러오지 못했습니다.")

  const root = asRecord(json)
  if (provider === "soop" && root.result !== 1) {
    throw new Error(firstString(root, ["msg", "message"]) ?? "SOOP 프로필을 불러오지 못했습니다.")
  }
  const content = asRecord(root.content)
  const data = asRecord(root.data)
  const source =
    Object.keys(content).length > 0
      ? content
      : Object.keys(data).length > 0
        ? data
        : root
  const id = firstString(source, [
    "channelId",
    "id",
    "user_id",
    "userId",
    "uid",
    "station_name",
  ])
  const name = firstString(source, ["channelName", "nickname", "name", "user_nick", "userName"])
  if (!id || !name) throw new Error("소셜 프로필 식별 정보가 없습니다.")

  const avatarUrl = firstString(source, [
    "channelImageUrl",
    "profile_image",
    "avatar",
    "avatarUrl",
  ])

  return {
    id,
    name,
    avatarUrl: avatarUrl?.startsWith("//") ? `https:${avatarUrl}` : avatarUrl,
    raw: source,
  } satisfies SocialProfile
}

async function upsertUser(provider: LoginProvider, tokens: TokenSet, profile: SocialProfile) {
  const supabase = createAdminClient()
  const { data: existing, error: findError } = await supabase
    .from("login_accounts")
    .select("id, user_id")
    .eq("provider", provider)
    .eq("provider_account_id", profile.id)
    .maybeSingle()
  if (findError) throw new Error(findError.message)

  let userId = existing?.user_id as string | undefined
  if (!userId) {
    const { data: created, error } = await supabase
      .from("app_users")
      .insert({ display_name: profile.name, avatar_url: profile.avatarUrl })
      .select("id")
      .single()
    if (error) throw new Error(error.message)
    userId = created.id as string
  } else {
    await supabase
      .from("app_users")
      .update({
        display_name: profile.name,
        avatar_url: profile.avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
  }

  const account = {
    user_id: userId,
    provider,
    provider_account_id: profile.id,
    access_token_encrypted: encryptToken(tokens.accessToken),
    refresh_token_encrypted: tokens.refreshToken ? encryptToken(tokens.refreshToken) : null,
    expires_at: tokens.expiresIn
      ? new Date(Date.now() + tokens.expiresIn * 1000).toISOString()
      : null,
    profile: profile.raw,
    updated_at: new Date().toISOString(),
  }
  const { error: accountError } = await supabase
    .from("login_accounts")
    .upsert(account, { onConflict: "provider,provider_account_id" })
  if (accountError) throw new Error(accountError.message)
  return userId
}

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> }
) {
  const { provider } = await context.params
  if (!isLoginProvider(provider)) {
    return NextResponse.json({ message: "지원하지 않는 로그인입니다." }, { status: 404 })
  }

  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const cookieStore = await cookies()
  const expectedState = cookieStore.get(`oauth_state_${provider}`)?.value
  cookieStore.delete(`oauth_state_${provider}`)

  const invalidState =
    provider === "soop" ? !expectedState : !state || state !== expectedState
  if (!code || invalidState) {
    return NextResponse.redirect(`${appOrigin()}/?error=${encodeURIComponent("로그인 요청이 만료되었거나 유효하지 않습니다.")}`)
  }

  try {
    const tokens = await exchangeCode(provider, code, state ?? "")
    const profile = await fetchProfile(provider, tokens.accessToken)
    const userId = await upsertUser(provider, tokens, profile)
    await createSession(userId)
    return NextResponse.redirect(`${appOrigin()}/dashboard`)
  } catch (error) {
    const message = error instanceof Error ? error.message : "로그인에 실패했습니다."
    return NextResponse.redirect(`${appOrigin()}/?error=${encodeURIComponent(message)}`)
  }
}
