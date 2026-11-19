import { NextResponse } from "next/server";
import { currentUser, unauthorized } from "@/lib/auth";
import { parseSubscription, removeSubscription, saveSubscription } from "@/lib/push";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const body = (await request.json().catch(() => null)) as { subscription?: unknown } | null;
  const sub = parseSubscription(body?.subscription);
  if (!sub) return NextResponse.json({ error: "That does not look like a notification subscription." }, { status: 400 });
  try {
    await saveSubscription(user.id, sub);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("saveSubscription failed", err);
    return NextResponse.json({ error: "Could not turn notifications on." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const body = (await request.json().catch(() => null)) as { endpoint?: unknown } | null;
  if (typeof body?.endpoint !== "string") return NextResponse.json({ error: "Missing endpoint." }, { status: 400 });
  try {
    await removeSubscription(user.id, body.endpoint);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("removeSubscription failed", err);
    return NextResponse.json({ error: "Could not turn notifications off." }, { status: 500 });
  }
}
