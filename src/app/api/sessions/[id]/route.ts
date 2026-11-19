import { NextResponse } from "next/server";
import { isUuid } from "@/lib/ids";
import { deleteSession, renameSession, UserFacingError } from "@/lib/sessions";
import { currentUser, unauthorized } from "@/lib/auth";

export async function DELETE(_request: Request, ctx: RouteContext<"/api/sessions/[id]">) {
  const user = await currentUser();
  if (!user) return unauthorized();

  const { id } = await ctx.params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "That lesson is already gone." }, { status: 404 });
  }

  try {
    await deleteSession(id, user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UserFacingError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("deleteSession failed", err);
    return NextResponse.json({ error: "Something went wrong deleting that lesson." }, { status: 500 });
  }
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/sessions/[id]">) {
  const user = await currentUser();
  if (!user) return unauthorized();

  const { id } = await ctx.params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "That lesson is already gone." }, { status: 404 });
  }
  const body = (await request.json().catch(() => ({}))) as { title?: unknown };

  try {
    const title = await renameSession(id, user.id, body.title);
    return NextResponse.json({ ok: true, title });
  } catch (err) {
    if (err instanceof UserFacingError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("renameSession failed", err);
    return NextResponse.json({ error: "Something went wrong renaming that lesson." }, { status: 500 });
  }
}
