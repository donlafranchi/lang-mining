import { NextResponse } from "next/server";
import { reviewCard } from "@/lib/deck";
import { isUuid } from "@/lib/ids";
import { UserFacingError } from "@/lib/sessions";
import { currentUser, unauthorized } from "@/lib/auth";

const RATINGS = ["again", "good", "easy"] as const;

export async function POST(request: Request, ctx: RouteContext<"/api/deck/[id]/review">) {
  const user = await currentUser();
  if (!user) return unauthorized();

  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ error: "That card is already gone." }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as { rating?: unknown };
  const rating = RATINGS.find((r) => r === body.rating);
  if (!rating) return NextResponse.json({ error: "Rate it again, good or easy." }, { status: 400 });

  try {
    await reviewCard(id, user.id, rating);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UserFacingError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("reviewCard failed", err);
    return NextResponse.json({ error: "Something went wrong saving that review." }, { status: 500 });
  }
}
