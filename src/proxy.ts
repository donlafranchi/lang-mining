import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { GATE_COOKIE, gateToken, safeEqual } from "./lib/gate";

export async function proxy(request: NextRequest) {
  const passcode = process.env.APP_PASSCODE;

  if (!passcode) {
    // Fail closed in production so a missing env var never leaves the app open.
    if (process.env.NODE_ENV === "production") {
      return new NextResponse("APP_PASSCODE is not set.", { status: 503 });
    }
    return NextResponse.next();
  }

  const cookie = request.cookies.get(GATE_COOKIE)?.value ?? "";
  if (cookie && safeEqual(cookie, await gateToken(passcode))) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Locked." }, { status: 401 });
  }
  const unlock = new URL("/unlock", request.url);
  return NextResponse.redirect(unlock);
}

export const config = {
  matcher: [
    // Everything except static assets, the unlock page and endpoint, and the cron route (which has its own secret).
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|unlock|api/unlock|api/cron).*)",
  ],
};
