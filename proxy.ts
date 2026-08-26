import { NextResponse, type NextRequest } from "next/server"

const SESSION_COOKIE = "sendbase_session"

export function proxy(request: NextRequest) {
  if (
    request.nextUrl.pathname === "/" &&
    request.cookies.has(SESSION_COOKIE)
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/"],
}
