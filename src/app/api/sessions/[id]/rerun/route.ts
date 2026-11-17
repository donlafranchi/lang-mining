import { NextResponse } from "next/server";
import { isDialect, rerunSession, UserFacingError } from "@/lib/sessions";

export const maxDuration = 60;

export async function POST(request: Request, ctx: RouteContext<"/api/sessions/[id]/rerun">) {
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => ({}))) as { dialect?: unknown };
  if (!isDialect(body.dialect)) {
    return NextResponse.json({ error: "Pick a dialect." }, { status: 400 });
  }

  try {
    await rerunSession(id, body.dialect);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UserFacingError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("rerunSession failed", err);
    return NextResponse.json({ error: "Something went wrong re-running that lesson." }, { status: 500 });
  }
}
