import { NextResponse } from "next/server";
import { createSession, isDialect, UserFacingError } from "@/lib/sessions";

export const maxDuration = 60;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { input?: unknown; dialect?: unknown };
  if (typeof body.input !== "string") {
    return NextResponse.json({ error: "Paste some Spanish text or a link first." }, { status: 400 });
  }
  if (!isDialect(body.dialect)) {
    return NextResponse.json({ error: "Pick a dialect." }, { status: 400 });
  }

  try {
    const result = await createSession({ input: body.input, dialect: body.dialect });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof UserFacingError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("createSession failed", err);
    return NextResponse.json({ error: "Something went wrong building that lesson." }, { status: 500 });
  }
}
