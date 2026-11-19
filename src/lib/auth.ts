import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { cache } from "react";
import { SESSION_COOKIE, verifySession } from "./session-token";
import { supabaseUserRepo } from "./users";

export type CurrentUser = { id: string; name: string; isAdmin: boolean };

/**
 * The secret that signs session cookies. In production it must be set. Outside production a fixed value is used so
 * local work does not need setup. Never use that value for anything real.
 */
export function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;
  return process.env.NODE_ENV === "production" ? "" : "development-only-session-secret-not-for-real-use";
}

/**
 * The signed-in person, or null. The cookie proves who they are, and the database says they still exist and have not
 * had their passcode reset since, so removing or resetting someone takes effect on their very next request.
 */
export const currentUser = cache(async (): Promise<CurrentUser | null> => {
  const secret = sessionSecret();
  if (!secret) return null;

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const payload = await verifySession(token, secret);
  if (!payload) return null;

  const user = await supabaseUserRepo().getById(payload.userId);
  if (!user || user.token_version !== payload.version) return null;
  return { id: user.id, name: user.name, isAdmin: user.is_admin };
});

export const SIGN_IN_FIRST = { error: "Sign in first." };

export function unauthorized(): NextResponse {
  return NextResponse.json(SIGN_IN_FIRST, { status: 401 });
}

/** For pages: the signed-in person, or send them to the login page. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}
