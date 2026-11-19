import { NextResponse } from "next/server";
import { removeUser } from "@/lib/admin";
import { currentUser, unauthorized } from "@/lib/auth";
import { isUuid } from "@/lib/ids";
import { UserFacingError } from "@/lib/sessions";
import { supabaseUserRepo } from "@/lib/users";

export async function DELETE(_request: Request, ctx: RouteContext<"/api/admin/users/[id]">) {
  const user = await currentUser();
  if (!user) return unauthorized();

  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ error: "That person is already gone." }, { status: 404 });

  try {
    const result = await removeUser(supabaseUserRepo(), { id: user.id, isAdmin: user.isAdmin }, id);
    if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UserFacingError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("removeUser failed", err);
    return NextResponse.json({ error: "Something went wrong removing that person." }, { status: 500 });
  }
}
