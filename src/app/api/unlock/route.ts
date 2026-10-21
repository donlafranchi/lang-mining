import { NextResponse } from "next/server";
import { GATE_COOKIE, gateToken, safeEqual } from "@/lib/gate";

export async function POST(request: Request) {
  const passcode = process.env.APP_PASSCODE;
  if (!passcode) return NextResponse.json({ error: "APP_PASSCODE is not set." }, { status: 503 });

  const body = (await request.json().catch(() => ({}))) as { passcode?: unknown };
  const attempt = typeof body.passcode === "string" ? body.passcode : "";
  if (!safeEqual(await gateToken(attempt), await gateToken(passcode))) {
    return NextResponse.json({ error: "Wrong passcode." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(GATE_COOKIE, await gateToken(passcode), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
