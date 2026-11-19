import { NextResponse } from "next/server";
import { addUser } from "@/lib/admin";
import { currentUser, unauthorized } from "@/lib/auth";
import { UserFacingError } from "@/lib/sessions";
import { supabaseUserRepo } from "@/lib/users";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();

  const body = (await request.json().catch(() => ({}))) as { name?: unknown; passcode?: unknown };
  const input = {
    name: typeof body.name === "string" ? body.name : "",
    passcode: typeof body.passcode === "string" ? body.passcode : "",
  };

  try {
    const result = await addUser(supabaseUserRepo(), { id: user.id, isAdmin: user.isAdmin }, input);
    if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UserFacingError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("addUser failed", err);
    return NextResponse.json({ error: "Something went wrong adding that person." }, { status: 500 });
  }
}
