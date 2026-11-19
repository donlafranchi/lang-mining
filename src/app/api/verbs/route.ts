import { NextResponse } from "next/server";
import { analyzerFromEnv } from "@/lib/analysis/http-analyzer";
import { currentUser, unauthorized } from "@/lib/auth";

/** Every common tense of one Spanish verb, for the "more forms" button. Needs the analysis service. */
export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const lemma = new URL(request.url).searchParams.get("lemma")?.trim() ?? "";
  if (!lemma || lemma.length > 60) return NextResponse.json({ error: "Missing verb." }, { status: 400 });
  const analyzer = analyzerFromEnv();
  if (!analyzer?.conjugateAll) return NextResponse.json({ error: "The other forms are not available right now." }, { status: 503 });
  try {
    return NextResponse.json(await analyzer.conjugateAll("es", lemma));
  } catch (err) {
    console.error("conjugateAll failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "The other forms are not available right now." }, { status: 502 });
  }
}
