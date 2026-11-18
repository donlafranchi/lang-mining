import Link from "next/link";
import { Quiz } from "@/components/Quiz";
import { listDue, type DeckItem } from "@/lib/deck";
import { LANGUAGES, resolveLanguage } from "@/lib/languages";

export const dynamic = "force-dynamic";

export default async function QuizPage(props: PageProps<"/quiz">) {
  const sp = await props.searchParams;
  const language = resolveLanguage(Array.isArray(sp.language) ? sp.language[0] : sp.language);

  let cards: DeckItem[] = [];
  let setupError = "";
  try {
    cards = await listDue(language);
  } catch (err) {
    setupError = err instanceof Error ? err.message : "Could not load the quiz.";
  }

  return (
    <main className="shell">
      <Link href={`/deck?language=${language}`} className="back">
        ← Deck
      </Link>
      <div className="brand">
        <h1>Quiz</h1>
      </div>

      <div className="tabs lang-tabs" role="tablist">
        {LANGUAGES.map((l) => (
          <Link key={l.id} href={`/quiz?language=${l.id}`} role="tab" aria-selected={language === l.id}>
            {l.label}
          </Link>
        ))}
      </div>

      {setupError && <p className="error">{setupError}</p>}
      {!setupError && cards.length === 0 && (
        <p className="muted">Nothing is due right now. Save more words from a lesson, or come back later.</p>
      )}
      {!setupError && cards.length > 0 && (
        // Keyed on the language so switching starts a fresh run.
        <Quiz key={language} cards={cards.map((c) => ({ id: c.id, payload: c.payload }))} language={language} />
      )}
    </main>
  );
}
