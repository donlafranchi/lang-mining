import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { deckSummary } from "@/lib/deck";
import { patternsFor } from "@/lib/patterns";
import { listSeenPatterns } from "@/lib/pattern-seen";

export const dynamic = "force-dynamic";

export default async function StudyPage() {
  const user = await requireUser();

  // The deck needs migration 0004; without it the page still opens, just without counts.
  let deck: { total: number; due: number } | null = null;
  try {
    const [es, fa] = await Promise.all([deckSummary(user.id, "es"), deckSummary(user.id, "fa")]);
    deck = { total: es.total + fa.total, due: es.due + fa.due };
  } catch {}
  const seen = await listSeenPatterns(user.id).catch((): string[] => []);
  const toLearn = [...patternsFor("es"), ...patternsFor("fa")].filter((p) => !seen.includes(p.id)).length;

  return (
    <main className="shell">
      <Link href="/" className="back">
        ← Back
      </Link>
      <div className="brand">
        <h1>Study</h1>
      </div>
      <nav className="stack" aria-label="Study">
        <Link className="btn secondary" href="/quiz">
          Quiz{deck ? ` (${deck.due} due)` : ""}
        </Link>
        <Link className="btn secondary" href="/deck">
          Deck{deck ? ` (${deck.total})` : ""}
        </Link>
        <Link className="btn secondary" href="/study/patterns">
          Grammar patterns ({toLearn} to learn)
        </Link>
      </nav>
    </main>
  );
}
