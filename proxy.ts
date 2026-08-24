import { NextResponse, type NextRequest } from "next/server"

const SESSION_COOKIE = "sendbase_session"

export function proxy(request: NextRequest) {
  if (
    request.nextUrl.pathname === "/terms" &&
    request.nextUrl.searchParams.get("tab") === "privacy"
  ) {
    const privacyUrl = request.nextUrl.clone()
    privacyUrl.pathname = "/privacy"
    privacyUrl.search = ""
    return NextResponse.redirect(privacyUrl, 308)
  }

  if (!request.cookies.has(SESSION_COOKIE)) return NextResponse.next()
  return NextResponse.redirect(new URL("/dashboard", request.url))
}

export const config = {
  matcher: ["/", "/terms"],
}
