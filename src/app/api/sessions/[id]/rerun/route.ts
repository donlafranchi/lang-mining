import { NextResponse } from "next/server";
import { after } from "next/server";
import { isHelpLevel, resolveHelp } from "@/lib/help";
import { isModel, resolveModel } from "@/lib/models";
import { finishRerun, startRerun, UserFacingError } from "@/lib/sessions";

// The lesson builds after the response is sent, so this is the ceiling for that build.
export const maxDuration = 300;

export async function POST(request: Request, ctx: RouteContext<"/api/sessions/[id]/rerun">) {
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => ({}))) as { help?: unknown; model?: unknown };
  if (body.help !== undefined && !isHelpLevel(body.help)) {
    return NextResponse.json({ error: "Pick full, medium or light help." }, { status: 400 });
  }
  if (body.model !== undefined && !isModel(body.model)) {
    return NextResponse.json({ error: "Pick a listed model." }, { status: 400 });
  }
  const help = resolveHelp(body.help);
  const model = resolveModel(body.model);

  try {
    const { text, language } = await startRerun(id);
    after(() => finishRerun({ id, text, language, help, model }));
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UserFacingError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("startRerun failed", err);
    return NextResponse.json({ error: "Something went wrong re-running that lesson." }, { status: 500 });
  }
}
