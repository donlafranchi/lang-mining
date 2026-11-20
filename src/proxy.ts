import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "./lib/session-token";

// The gate only checks that the cookie is a genuine, unexpired session. Which person it is, and whether they still
// exist, is checked on the server for each request (see lib/auth.ts).
export async function proxy(request: NextRequest) {
  const secret = process.env.SESSION_SECRET || (process.env.NODE_ENV === "production" ? "" : "development-only-session-secret-not-for-real-use");

  if (!secret) {
    // Fail closed in production so a missing env var never leaves the app open.
    return new NextResponse("SESSION_SECRET is not set.", { status: 503 });
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySession(token, secret)) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: [
    // Everything except static assets, the login page and endpoint, and what an installed app needs before anyone has
    // signed in: the service worker, the offline page and the icons. None of them holds private data.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|apple-icon.png|sw.js|offline|login|api/login|signup|api/signup).*)",
  ],
};
