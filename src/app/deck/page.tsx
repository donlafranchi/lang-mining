import Link from "next/link";
import { RemoveCardButton } from "@/components/RemoveCardButton";
import { deckSummary, listDeck, type DeckItem, type DeckSummary } from "@/lib/deck";
import { isDue } from "@/lib/srs";
import { LANGUAGES } from "@/lib/languages";
import { preferredLanguage } from "@/lib/language-pref";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DeckPage(props: PageProps<"/deck">) {
  const user = await requireUser();
  const sp = await props.searchParams;
  const language = await preferredLanguage(sp.language);

  let items: DeckItem[] = [];
  let summary: DeckSummary = { total: 0, due: 0 };
  let setupError = "";
  try {
    [items, summary] = await Promise.all([listDeck(user.id, language), deckSummary(user.id, language)]);
  } catch (err) {
    setupError = err instanceof Error ? err.message : "Could not load the deck.";
  }
  const now = new Date();

  return (
    <main className="shell">
      <Link href="/study" className="back">
        ← Study
      </Link>
      <div className="brand">
        <h1>Deck</h1>
      </div>

      <div className="tabs lang-tabs" role="tablist">
        {LANGUAGES.map((l) => (
          <Link key={l.id} href={`/deck?language=${l.id}`} role="tab" aria-selected={language === l.id}>
            {l.label}
          </Link>
        ))}
      </div>

      {setupError && <p className="error">{setupError}</p>}

      {!setupError && (
        <div className="stack">
          <p className="muted">
            {summary.total} {summary.total === 1 ? "word" : "words"} · {summary.due} due
          </p>
          {summary.due > 0 && (
            <Link className="btn" href={`/quiz?language=${language}`}>
              Start quiz ({Math.min(summary.due, 20)})
            </Link>
          )}
          {items.length === 0 && (
            <p className="muted">No words yet. Open a lesson and tap “Save to deck” on a vocabulary entry.</p>
          )}
          <section className="recent">
            {items.map((item) => (
              <div key={item.id} className="row">
                <div className="deck-row">
                  <span className="title" dir="auto">
                    <span className="lead">{item.payload.lemma}</span> · {item.payload.english}
                  </span>
                  {isDue(item.next_review_at, now) && <span className="pill">due</span>}
                </div>
                <RemoveCardButton id={item.id} />
              </div>
            ))}
          </section>
        </div>
      )}
    </main>
  );
}
