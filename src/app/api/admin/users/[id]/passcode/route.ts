import { NextResponse } from "next/server";
import { resetPasscode } from "@/lib/admin";
import { currentUser, unauthorized } from "@/lib/auth";
import { isUuid } from "@/lib/ids";
import { UserFacingError } from "@/lib/sessions";
import { supabaseUserRepo } from "@/lib/users";

export async function POST(request: Request, ctx: RouteContext<"/api/admin/users/[id]/passcode">) {
  const user = await currentUser();
  if (!user) return unauthorized();

  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ error: "That person is already gone." }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as { passcode?: unknown };
  const passcode = typeof body.passcode === "string" ? body.passcode : "";

  try {
    const result = await resetPasscode(supabaseUserRepo(), { id: user.id, isAdmin: user.isAdmin }, id, passcode);
    if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UserFacingError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("resetPasscode failed", err);
    return NextResponse.json({ error: "Something went wrong resetting that passcode." }, { status: 500 });
  }
}
