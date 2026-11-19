import Link from "next/link";
import { Quiz, type QuizMode } from "@/components/Quiz";
import { listDue, type DeckItem } from "@/lib/deck";
import { LANGUAGES } from "@/lib/languages";
import { preferredLanguage } from "@/lib/language-pref";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function QuizPage(props: PageProps<"/quiz">) {
  const user = await requireUser();
  const sp = await props.searchParams;
  const language = await preferredLanguage(sp.language);
  const mode: QuizMode = (Array.isArray(sp.mode) ? sp.mode[0] : sp.mode) === "read" ? "read" : "write";

  let cards: DeckItem[] = [];
  let setupError = "";
  try {
    cards = await listDue(user.id, language);
  } catch (err) {
    setupError = err instanceof Error ? err.message : "Could not load the quiz.";
  }

  return (
    <main className="shell">
      <Link href="/study" className="back">
        ← Study
      </Link>
      <div className="brand">
        <h1>Quiz</h1>
      </div>

      <div className="tabs lang-tabs" role="tablist">
        {LANGUAGES.map((l) => (
          <Link key={l.id} href={`/quiz?language=${l.id}&mode=${mode}`} role="tab" aria-selected={language === l.id}>
            {l.label}
          </Link>
        ))}
      </div>

      <div className="tabs lang-tabs" role="tablist" aria-label="Quiz style">
        {(["write", "read"] as const).map((m) => (
          <Link key={m} href={`/quiz?language=${language}&mode=${m}`} role="tab" aria-selected={mode === m}>
            {m === "write" ? "Write it" : "Recognise it"}
          </Link>
        ))}
      </div>

      {setupError && <p className="error">{setupError}</p>}
      {!setupError && cards.length === 0 && (
        <p className="muted">Nothing is due right now. Save more words from a lesson, or come back later.</p>
      )}
      {!setupError && cards.length > 0 && (
        // Keyed on the language so switching starts a fresh run.
        <Quiz key={`${language}-${mode}`} mode={mode} cards={cards.map((c) => ({ id: c.id, payload: c.payload }))} language={language} />
      )}
    </main>
  );
}
