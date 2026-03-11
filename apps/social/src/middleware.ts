import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Webhook API routes use API key auth, not session auth
  if (pathname.startsWith("/api/webhooks")) {
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookie(request);

  // Redirect authenticated users away from login
  if (sessionCookie && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Redirect unauthenticated users to login (all non-login routes are protected)
  if (!sessionCookie && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
