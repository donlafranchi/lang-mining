import { NextResponse } from "next/server";
import { currentUser, unauthorized } from "@/lib/auth";
import { markPatternSeen } from "@/lib/pattern-seen";
import { UserFacingError } from "@/lib/sessions";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const body = (await request.json().catch(() => ({}))) as { id?: unknown };
  try {
    await markPatternSeen(user.id, body.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UserFacingError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("markPatternSeen failed", err);
    return NextResponse.json({ error: "Something went wrong saving that." }, { status: 500 });
  }
}
