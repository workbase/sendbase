import { randomBytes } from "node:crypto"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import {
  appOrigin,
  getLoginProviderConfig,
  isLoginProvider,
} from "@/lib/auth/providers"

export async function GET(
  _request: Request,
  context: { params: Promise<{ provider: string }> }
) {
  const { provider } = await context.params
  if (!isLoginProvider(provider)) {
    return NextResponse.json(
      { message: "지원하지 않는 로그인입니다." },
      { status: 404 }
    )
  }

  try {
    const config = getLoginProviderConfig(provider)
    const state = randomBytes(24).toString("base64url")
    const redirectUri = `${appOrigin()}/api/auth/${provider}/callback`
    const url = new URL(config.authorizeUrl)
    if (provider === "soop") {
      url.searchParams.set("client_id", config.clientId)
      url.searchParams.set("state", state)
    } else {
      url.searchParams.set("clientId", config.clientId)
      url.searchParams.set("redirectUri", redirectUri)
      url.searchParams.set("state", state)
    }

    const cookieStore = await cookies()
    cookieStore.set(`oauth_state_${provider}`, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 60,
      path: "/",
    })
    return NextResponse.redirect(url)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "로그인 설정 오류입니다."
    return NextResponse.redirect(
      `${appOrigin()}/?error=${encodeURIComponent(message)}`
    )
  }
}
