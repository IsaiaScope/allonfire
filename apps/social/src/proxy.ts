import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API routes that use Bearer token auth instead of session auth
  if (
    pathname.startsWith("/api/webhooks") ||
    pathname === "/api/classify-topics" ||
    pathname === "/api/rerank-and-prune"
  ) {
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookie(request);

  // Let /login render freely — the page handles authenticated users client-side.
  // Middleware can't validate session tokens, so redirecting away from /login
  // based on cookie existence causes redirect loops when sessions are stale.
  if (pathname === "/login") {
    return NextResponse.next();
  }

  // Redirect unauthenticated users to login (all non-login routes are protected)
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
