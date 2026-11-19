import { NextResponse } from "next/server";
import { sessionSecret } from "@/lib/auth";
import { attemptLogin } from "@/lib/login";
import { SESSION_COOKIE, SESSION_DAYS, signSession } from "@/lib/session-token";
import { UserFacingError } from "@/lib/sessions";
import { supabaseUserRepo } from "@/lib/users";

export async function POST(request: Request) {
  const secret = sessionSecret();
  if (!secret) return NextResponse.json({ error: "SESSION_SECRET is not set." }, { status: 503 });

  const body = (await request.json().catch(() => ({}))) as { name?: unknown; passcode?: unknown };
  const name = typeof body.name === "string" ? body.name : "";
  const passcode = typeof body.passcode === "string" ? body.passcode : "";

  try {
    const result = await attemptLogin(supabaseUserRepo(), { name, passcode }, { bootstrapPasscode: process.env.APP_PASSCODE, now: new Date() });
    if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });

    const res = NextResponse.json({ ok: true, name: result.user.name, created: result.created });
    res.cookies.set(SESSION_COOKIE, await signSession({ userId: result.user.id, version: result.user.token_version }, secret), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * SESSION_DAYS,
    });
    return res;
  } catch (err) {
    if (err instanceof UserFacingError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("login failed", err);
    return NextResponse.json({ error: "Something went wrong signing in." }, { status: 500 });
  }
}
