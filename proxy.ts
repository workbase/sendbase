import { NextResponse, type NextRequest } from "next/server"

const SESSION_COOKIE = "sendbase_session"

export function proxy(request: NextRequest) {
  if (!request.cookies.has(SESSION_COOKIE)) return NextResponse.next()
  return NextResponse.redirect(new URL("/dashboard", request.url))
}

export const config = {
  matcher: "/",
}
