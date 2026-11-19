import { NextResponse } from "next/server";
import { sessionSecret } from "@/lib/auth";
import { attemptLogin, type LoginResult } from "@/lib/login";
import { isSameOrigin } from "@/lib/origin";
import { SESSION_COOKIE, SESSION_DAYS, signSession } from "@/lib/session-token";
import { UserFacingError } from "@/lib/sessions";
import { supabaseUserRepo } from "@/lib/users";

/**
 * Sign-in. The login page posts a plain HTML form here, which is what lets the iPhone password manager offer to save
 * and fill the name and password: Safari only does that for a real form submission that ends on a new page. A script
 * can still call it with JSON.
 */
export async function POST(request: Request) {
  const isForm = /^(application\/x-www-form-urlencoded|multipart\/form-data)/i.test(request.headers.get("content-type") ?? "");

  if (isForm && !isSameOrigin(request.headers.get("origin"), request.headers.get("host"), request.headers.get("sec-fetch-site"))) {
    return NextResponse.json({ error: "That sign-in did not come from this site." }, { status: 403 });
  }

  const secret = sessionSecret();
  if (!secret) return respond(isForm, request, { ok: false, status: 503, code: "setup", message: "SESSION_SECRET is not set." });

  const { name, passcode } = await readCredentials(request, isForm);

  try {
    const result = await attemptLogin(supabaseUserRepo(), { name, passcode }, { bootstrapPasscode: process.env.APP_PASSCODE, now: new Date() });
    if (!result.ok) return respond(isForm, request, result);

    const res = isForm
      ? NextResponse.redirect(new URL("/", request.url), 303)
      : NextResponse.json({ ok: true, name: result.user.name, created: result.created });
    res.cookies.set(SESSION_COOKIE, await signSession({ userId: result.user.id, version: result.user.token_version }, secret), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * SESSION_DAYS,
    });
    return res;
  } catch (err) {
    if (err instanceof UserFacingError) {
      return isForm
        ? NextResponse.redirect(new URL("/login?error=setup", request.url), 303)
        : NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("login failed", err);
    return isForm
      ? NextResponse.redirect(new URL("/login?error=setup", request.url), 303)
      : NextResponse.json({ error: "Something went wrong signing in." }, { status: 500 });
  }
}

/** The form uses the standard field names username and password, which helps the password manager recognise them. */
async function readCredentials(request: Request, isForm: boolean): Promise<{ name: string; passcode: string }> {
  if (isForm) {
    const form = await request.formData().catch(() => null);
    const name = form?.get("username");
    const password = form?.get("password");
    return { name: typeof name === "string" ? name : "", passcode: typeof password === "string" ? password : "" };
  }
  const body = (await request.json().catch(() => ({}))) as { name?: unknown; passcode?: unknown };
  return { name: typeof body.name === "string" ? body.name : "", passcode: typeof body.passcode === "string" ? body.passcode : "" };
}

/** A failed sign-in: send the browser back to the login page with a short code, or answer a script with JSON. */
function respond(isForm: boolean, request: Request, result: Extract<LoginResult, { ok: false }>): NextResponse {
  if (!isForm) return NextResponse.json({ error: result.message }, { status: result.status });
  const url = new URL("/login", request.url);
  url.searchParams.set("error", result.code);
  if (result.minutes) url.searchParams.set("minutes", String(result.minutes));
  return NextResponse.redirect(url, 303);
}
