import { NextResponse } from "next/server";
import { currentUser, unauthorized } from "@/lib/auth";
import { BlocklistError, removeParagraph } from "@/lib/blocklist";
import { isUuid } from "@/lib/ids";

/** "Not part of the article": the owner takes a paragraph out of a lesson, and the site is taught to skip that line. */
export async function POST(request: Request, ctx: RouteContext<"/api/sessions/[id]/remove-paragraph">) {
  const user = await currentUser();
  if (!user) return unauthorized();
  if (!user.isAdmin) return NextResponse.json({ error: "Only the owner can do that." }, { status: 403 });

  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ error: "That lesson is already gone." }, { status: 404 });
  const body = (await request.json().catch(() => ({}))) as { index?: unknown };
  if (typeof body.index !== "number") return NextResponse.json({ error: "Missing paragraph." }, { status: 400 });

  try {
    const out = await removeParagraph(id, user.id, body.index);
    return NextResponse.json({ ok: true, ...out });
  } catch (err) {
    if (err instanceof BlocklistError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("removeParagraph failed", err);
    return NextResponse.json({ error: "Something went wrong removing that paragraph." }, { status: 500 });
  }
}
