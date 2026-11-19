import { NextResponse } from "next/server";
import { addManyToDeck, addToDeck } from "@/lib/deck";
import { MAX_SAVE_BATCH } from "@/lib/deck-limits";
import { parseDeckPayload, type DeckPayload } from "@/lib/deck-payload";
import { isUuid } from "@/lib/ids";
import { isLanguage } from "@/lib/languages";
import { UserFacingError } from "@/lib/sessions";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { language?: unknown; payload?: unknown; payloads?: unknown; sessionId?: unknown };
  if (!isLanguage(body.language)) {
    return NextResponse.json({ error: "Pick Spanish or Farsi." }, { status: 400 });
  }
  const sessionId = typeof body.sessionId === "string" && isUuid(body.sessionId) ? body.sessionId : null;

  // Many words at once: "Save all" on a paragraph or the Vocab tab.
  if (body.payloads !== undefined) {
    if (!Array.isArray(body.payloads) || body.payloads.length === 0 || body.payloads.length > MAX_SAVE_BATCH) {
      return NextResponse.json({ error: `Save between 1 and ${MAX_SAVE_BATCH} words at a time.` }, { status: 400 });
    }
    const payloads: DeckPayload[] = [];
    for (const raw of body.payloads) {
      const parsed = parseDeckPayload(raw);
      if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
      payloads.push(parsed.data);
    }
    try {
      const { created, total } = await addManyToDeck({ language: body.language, payloads, sessionId });
      return NextResponse.json({ ok: true, created, total });
    } catch (err) {
      if (err instanceof UserFacingError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      console.error("addManyToDeck failed", err);
      return NextResponse.json({ error: "Something went wrong saving those words." }, { status: 500 });
    }
  }

  const payload = parseDeckPayload(body.payload);
  if (!payload.ok) return NextResponse.json({ error: payload.error }, { status: 400 });

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
