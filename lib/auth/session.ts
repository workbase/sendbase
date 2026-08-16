import { randomBytes } from "node:crypto"
import { cache } from "react"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { createAdminClient } from "@/lib/supabase/admin"
import type { AppUser, LoginProvider } from "@/lib/types"
import { hashToken } from "@/lib/auth/crypto"

const SESSION_COOKIE = "sendbase_session"
const SESSION_DAYS = 3650
const loginProviderValues = new Set<LoginProvider>(["chzzk", "soop", "cime"])

export async function createSession(userId: string) {
  const rawToken = randomBytes(32).toString("base64url")
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
  const supabase = createAdminClient()
  const { error } = await supabase.from("app_sessions").insert({
    user_id: userId,
    token_hash: hashToken(rawToken),
    expires_at: expiresAt.toISOString(),
  })
  if (error) throw new Error(`세션을 만들지 못했습니다: ${error.message}`)

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  })
}

export async function deleteSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (token) {
    const supabase = createAdminClient()
    await supabase
      .from("app_sessions")
      .delete()
      .eq("token_hash", hashToken(token))
  }
  cookieStore.delete(SESSION_COOKIE)
}

export const getCurrentUser = cache(async (): Promise<AppUser | null> => {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("app_sessions")
    .select(
      "user_id, expires_at, app_users(id, display_name, avatar_url, login_accounts(provider))"
    )
    .eq("token_hash", hashToken(token))
    .gt("expires_at", new Date().toISOString())
    .maybeSingle()

  if (error || !data) return null
  const joined = data.app_users as unknown as {
    id: string
    display_name: string
    avatar_url: string | null
    login_accounts: Array<{ provider: string }>
  } | null
  if (!joined) return null

  const loginProviders = joined.login_accounts.flatMap(({ provider }) =>
    loginProviderValues.has(provider as LoginProvider)
      ? [provider as LoginProvider]
      : []
  )

  return {
    id: joined.id,
    displayName: joined.display_name,
    avatarUrl: joined.avatar_url,
    loginProviders,
  }
})

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) redirect("/")
  return user
}
