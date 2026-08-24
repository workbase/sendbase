import { createHash, randomBytes } from "node:crypto"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { appOrigin } from "@/lib/auth/providers"
import { getCurrentUser } from "@/lib/auth/session"

type ApiPlatform = "threads" | "x" | "discord"

function isApiPlatform(value: string): value is ApiPlatform {
  return value === "threads" || value === "x" || value === "discord"
}

function required(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} 환경 변수가 필요합니다.`)
  return value
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ platform: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.redirect(appOrigin())
  const { platform } = await context.params
  if (!isApiPlatform(platform)) {
    return NextResponse.json({ message: "지원하지 않는 플랫폼입니다." }, { status: 404 })
  }

  try {
    const state = randomBytes(24).toString("base64url")
    const redirectUri = `${appOrigin()}/api/connect/${platform}/callback`
    let authorizeUrl: URL
    let verifier: string | null = null

    if (platform === "threads") {
      authorizeUrl = new URL("https://threads.net/oauth/authorize")
      authorizeUrl.searchParams.set("client_id", required("THREADS_CLIENT_ID"))
      authorizeUrl.searchParams.set("scope", "threads_basic,threads_content_publish")
    } else if (platform === "x") {
      authorizeUrl = new URL("https://x.com/i/oauth2/authorize")
      verifier = randomBytes(48).toString("base64url")
      const challenge = createHash("sha256").update(verifier).digest("base64url")
      authorizeUrl.searchParams.set("client_id", required("X_CLIENT_ID"))
      authorizeUrl.searchParams.set(
        "scope",
        "tweet.read tweet.write media.write users.read offline.access"
      )
      authorizeUrl.searchParams.set("code_challenge", challenge)
      authorizeUrl.searchParams.set("code_challenge_method", "S256")
    } else {
      authorizeUrl = new URL("https://discord.com/oauth2/authorize")
      authorizeUrl.searchParams.set("client_id", required("DISCORD_CLIENT_ID"))
      authorizeUrl.searchParams.set("scope", "identify webhook.incoming")
      authorizeUrl.searchParams.set("prompt", "consent")
    }

    authorizeUrl.searchParams.set("response_type", "code")
    authorizeUrl.searchParams.set("redirect_uri", redirectUri)
    authorizeUrl.searchParams.set("state", state)
    const cookieStore = await cookies()
    cookieStore.set(
      `connect_state_${platform}`,
      JSON.stringify({ state, verifier }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 10 * 60,
        path: "/",
      }
    )
    return NextResponse.redirect(authorizeUrl)
  } catch (error) {
    const message = error instanceof Error ? error.message : "플랫폼 연결 설정 오류입니다."
    return NextResponse.redirect(`${appOrigin()}/settings?error=${encodeURIComponent(message)}`)
  }
}
