import { NextResponse } from "next/server";
import { removeCard } from "@/lib/deck";
import { isUuid } from "@/lib/ids";
import { UserFacingError } from "@/lib/sessions";
import { currentUser, unauthorized } from "@/lib/auth";

export async function DELETE(_request: Request, ctx: RouteContext<"/api/deck/[id]">) {
  const user = await currentUser();
  if (!user) return unauthorized();

  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ error: "That card is already gone." }, { status: 404 });

  try {
    await removeCard(id, user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UserFacingError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("removeCard failed", err);
    return NextResponse.json({ error: "Something went wrong deleting that card." }, { status: 500 });
  }
}
