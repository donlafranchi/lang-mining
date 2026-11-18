import { NextResponse } from "next/server";
import { after } from "next/server";
import { isModel, resolveModel } from "@/lib/models";
import { buildSession, createSession, isDialect, UserFacingError } from "@/lib/sessions";

// The lesson builds after the response is sent, so this is the ceiling for that build.
export const maxDuration = 300;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { input?: unknown; dialect?: unknown; model?: unknown };
  if (typeof body.input !== "string") {
    return NextResponse.json({ error: "Paste some Spanish text or a link first." }, { status: 400 });
  }
  if (!isDialect(body.dialect)) {
    return NextResponse.json({ error: "Pick a dialect." }, { status: 400 });
  }
  if (body.model !== undefined && !isModel(body.model)) {
    return NextResponse.json({ error: "Pick a listed model." }, { status: 400 });
  }
  const dialect = body.dialect;
  const model = resolveModel(body.model);

  try {
    const { id, text } = await createSession({ input: body.input, dialect });
    after(() => buildSession({ id, text, dialect, model }));
    return NextResponse.json({ id, status: "processing" });
  } catch (err) {
    if (err instanceof UserFacingError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("createSession failed", err);
    return NextResponse.json({ error: "Something went wrong saving that text." }, { status: 500 });
  }
}
