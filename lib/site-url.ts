const localSiteUrl = "http://localhost:3000"

export function getSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || localSiteUrl

  try {
    const siteUrl = new URL(configuredUrl)
    siteUrl.pathname = "/"
    siteUrl.search = ""
    siteUrl.hash = ""
    return siteUrl
  } catch {
    throw new Error("NEXT_PUBLIC_APP_URL은 유효한 절대 URL이어야 합니다.")
  }
}
