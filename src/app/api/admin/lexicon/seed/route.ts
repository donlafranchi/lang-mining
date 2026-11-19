import { NextResponse } from "next/server";
import { currentUser, unauthorized } from "@/lib/auth";
import { seedCore } from "@/lib/lexicon/harvest";
import { supabaseLexiconStore } from "@/lib/lexicon/store";
import { UserFacingError } from "@/lib/sessions";

// Loads the core 2,000 words of both languages into the lexicon. Safe to run again.
export async function POST() {
  const user = await currentUser();
  if (!user) return unauthorized();
  if (!user.isAdmin) return NextResponse.json({ error: "Only the owner can do that." }, { status: 403 });

  try {
    const store = supabaseLexiconStore();
    const es = await seedCore(store, "es");
    const fa = await seedCore(store, "fa");
    return NextResponse.json({ ok: true, added: { es, fa } });
  } catch (err) {
    if (err instanceof UserFacingError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("seedCore failed", err);
    return NextResponse.json({ error: "Something went wrong loading the words." }, { status: 500 });
  }
}
