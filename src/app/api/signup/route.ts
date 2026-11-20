import { NextResponse } from "next/server";
import { sessionSecret } from "@/lib/auth";
import { isSameOrigin } from "@/lib/origin";
import { SESSION_COOKIE, SESSION_DAYS, signSession } from "@/lib/session-token";
import { UserFacingError } from "@/lib/sessions";
import { signUp } from "@/lib/signup";
import { supabaseUserRepo } from "@/lib/users";

/** Sign-up from a plain HTML form (so the iPhone password manager offers to save the new password), then straight in. */
export async function POST(request: Request) {
  if (!isSameOrigin(request.headers.get("origin"), request.headers.get("host"), request.headers.get("sec-fetch-site"))) {
    return NextResponse.json({ error: "That did not come from this site." }, { status: 403 });
  }
  const back = (error: string) => NextResponse.redirect(new URL(`/signup?error=${error}`, request.url), 303);

  const secret = sessionSecret();
  if (!secret) return back("closed");

  const form = await request.formData().catch(() => null);
  const field = (k: string) => {
    const v = form?.get(k);
    return typeof v === "string" ? v : "";
  };

  try {
    const result = await signUp(
      supabaseUserRepo(),
      { name: field("username"), passcode: field("password"), code: field("code") },
      { signupCode: process.env.SIGNUP_CODE },
    );
    if (!result.ok) return back(result.code);
    const res = NextResponse.redirect(new URL("/", request.url), 303);
    res.cookies.set(SESSION_COOKIE, await signSession({ userId: result.user.id, version: result.user.token_version }, secret), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * SESSION_DAYS,
    });
    return res;
  } catch (err) {
    if (!(err instanceof UserFacingError)) console.error("signup failed", err);
    return back("closed");
  }
}
