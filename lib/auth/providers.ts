import type { LoginProvider } from "@/lib/types"

type LoginProviderConfig = {
  clientId: string
  clientSecret: string
  authorizeUrl: string
  tokenUrl: string
  profileUrl: string
  scopes?: string
}

function env(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} 환경 변수가 필요합니다.`)
  return value
}

export function getLoginProviderConfig(provider: LoginProvider): LoginProviderConfig {
  if (provider === "chzzk") {
    return {
      clientId: env("CHZZK_CLIENT_ID"),
      clientSecret: env("CHZZK_CLIENT_SECRET"),
      authorizeUrl: "https://chzzk.naver.com/account-interlock",
      tokenUrl: "https://openapi.chzzk.naver.com/auth/v1/token",
      profileUrl: "https://openapi.chzzk.naver.com/open/v1/users/me",
    }
  }

  if (provider === "cime") {
    return {
      clientId: env("CIME_CLIENT_ID"),
      clientSecret: env("CIME_CLIENT_SECRET"),
      authorizeUrl: "https://ci.me/auth/openapi/account-interlock",
      tokenUrl: "https://ci.me/api/openapi/auth/v1/token",
      profileUrl: "https://ci.me/api/openapi/open/v1/users/me",
    }
  }

  return {
    clientId: env("SOOP_CLIENT_ID"),
    clientSecret: env("SOOP_CLIENT_SECRET"),
    authorizeUrl:
      process.env.SOOP_AUTHORIZE_URL ??
      "https://openapi.sooplive.co.kr/oauth2.0/authorize",
    tokenUrl:
      process.env.SOOP_TOKEN_URL ?? "https://openapi.sooplive.co.kr/oauth2.0/token",
    profileUrl:
      process.env.SOOP_PROFILE_URL ?? "https://openapi.sooplive.co.kr/user/me",
    scopes: process.env.SOOP_LOGIN_SCOPES,
  }
}

export function isLoginProvider(value: string): value is LoginProvider {
  return value === "chzzk" || value === "soop" || value === "cime"
}

export function appOrigin() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
}
