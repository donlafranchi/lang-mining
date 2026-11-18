import { NextResponse } from "next/server";
import { isUuid } from "@/lib/ids";
import { deleteSession, UserFacingError } from "@/lib/sessions";

export async function DELETE(_request: Request, ctx: RouteContext<"/api/sessions/[id]">) {
  const { id } = await ctx.params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "That lesson is already gone." }, { status: 404 });
  }

  try {
    await deleteSession(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UserFacingError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("deleteSession failed", err);
    return NextResponse.json({ error: "Something went wrong deleting that lesson." }, { status: 500 });
  }
}
