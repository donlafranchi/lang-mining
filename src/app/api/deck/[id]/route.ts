import { NextResponse } from "next/server";
import { removeCard } from "@/lib/deck";
import { isUuid } from "@/lib/ids";
import { UserFacingError } from "@/lib/sessions";

export async function DELETE(_request: Request, ctx: RouteContext<"/api/deck/[id]">) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ error: "That card is already gone." }, { status: 404 });

  try {
    await removeCard(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UserFacingError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("removeCard failed", err);
    return NextResponse.json({ error: "Something went wrong deleting that card." }, { status: 500 });
  }
}
