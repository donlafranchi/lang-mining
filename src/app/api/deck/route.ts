import { NextResponse } from "next/server";
import { addToDeck } from "@/lib/deck";
import { parseDeckPayload } from "@/lib/deck-payload";
import { isUuid } from "@/lib/ids";
import { isLanguage } from "@/lib/languages";
import { UserFacingError } from "@/lib/sessions";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { language?: unknown; payload?: unknown; sessionId?: unknown };
  if (!isLanguage(body.language)) {
    return NextResponse.json({ error: "Pick Spanish or Farsi." }, { status: 400 });
  }
  const payload = parseDeckPayload(body.payload);
  if (!payload.ok) return NextResponse.json({ error: payload.error }, { status: 400 });
  const sessionId = typeof body.sessionId === "string" && isUuid(body.sessionId) ? body.sessionId : null;

  try {
    const { created } = await addToDeck({ language: body.language, payload: payload.data, sessionId });
    return NextResponse.json({ ok: true, created });
  } catch (err) {
    if (err instanceof UserFacingError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("addToDeck failed", err);
    return NextResponse.json({ error: "Something went wrong saving that word." }, { status: 500 });
  }
}
