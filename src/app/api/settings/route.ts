import { NextResponse } from "next/server";
import { currentUser, unauthorized } from "@/lib/auth";
import { saveHelp } from "@/lib/settings";
import { UserFacingError } from "@/lib/sessions";
import { supabaseUserRepo } from "@/lib/users";

export async function PUT(request: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();

  const body = (await request.json().catch(() => ({}))) as { language?: unknown; help?: unknown };
  try {
    const result = await saveHelp(supabaseUserRepo(), user.id, body);
    if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UserFacingError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("saveHelp failed", err);
    return NextResponse.json({ error: "Something went wrong saving that." }, { status: 500 });
  }
}
