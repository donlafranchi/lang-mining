import { NextResponse } from "next/server";
import { after } from "next/server";
import { isHelpLevel, resolveHelp } from "@/lib/help";
import { isLanguage, resolveLanguage } from "@/lib/languages";
import { isModel, resolveModel } from "@/lib/models";
import { buildSession, createSession, UserFacingError } from "@/lib/sessions";
import { currentUser, unauthorized } from "@/lib/auth";

// The lesson builds after the response is sent, so this is the ceiling for that build.
export const maxDuration = 300;

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();

  const body = (await request.json().catch(() => ({}))) as { input?: unknown; language?: unknown; help?: unknown; model?: unknown };
  if (typeof body.input !== "string") {
    return NextResponse.json({ error: "Paste some text or a link first." }, { status: 400 });
  }
  if (body.language !== undefined && !isLanguage(body.language)) {
    return NextResponse.json({ error: "Pick Spanish or Farsi." }, { status: 400 });
  }
  if (body.help !== undefined && !isHelpLevel(body.help)) {
    return NextResponse.json({ error: "Pick full, medium or light help." }, { status: 400 });
  }
  if (body.model !== undefined && !isModel(body.model)) {
    return NextResponse.json({ error: "Pick a listed model." }, { status: 400 });
  }
  const language = resolveLanguage(body.language);
  const help = body.help === undefined ? user.help[language] : resolveHelp(body.help, language);
  const model = resolveModel(body.model);

  try {
    const { id, text } = await createSession({ input: body.input, language, userId: user.id });
    after(() => buildSession({ id, text, language, help, model }));
    return NextResponse.json({ id, status: "processing" });
  } catch (err) {
    if (err instanceof UserFacingError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("createSession failed", err);
    return NextResponse.json({ error: "Something went wrong saving that text." }, { status: 500 });
  }
}
