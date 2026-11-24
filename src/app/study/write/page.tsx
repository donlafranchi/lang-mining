import Link from "next/link";
import { WritePractice } from "@/components/WritePractice";
import { requireUser } from "@/lib/auth";
import { listDeck, QUIZ_SIZE, type DeckItem } from "@/lib/deck";
import { LANGUAGES } from "@/lib/languages";
import { preferredLanguage } from "@/lib/language-pref";

export const dynamic = "force-dynamic";

/** A fresh random handful each time, so writing practice is never the same twenty in the same order. */
function pick(items: DeckItem[], n: number): DeckItem[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

export default async function WritePage(props: PageProps<"/study/write">) {
  const user = await requireUser();
  const sp = await props.searchParams;
  const language = await preferredLanguage(sp.language);

  let cards: DeckItem[] = [];
  let setupError = "";
  try {
    cards = pick(await listDeck(user.id, language), QUIZ_SIZE);
  } catch (err) {
    setupError =
      err instanceof Error ? err.message : "Could not load your words.";
  }

  return (
    <main className="shell">
      <Link href="/study" className="back">
        ← Study
      </Link>
      <div className="brand">
        <h1>Writing</h1>
      </div>
      <div className="tabs lang-tabs" role="tablist">
        {LANGUAGES.map((l) => (
          <Link
            key={l.id}
            href={`/study/write?language=${l.id}`}
            role="tab"
            aria-selected={language === l.id}
          >
            {l.label}
          </Link>
        ))}
      </div>
      {setupError && <p className="error">{setupError}</p>}
      {!setupError && cards.length === 0 && (
        <p className="muted">
          No words yet. Add some from a lesson or the core 2,000, then come back
          to write them.
        </p>
      )}
      {!setupError && cards.length > 0 && (
        <>
          <p className="muted">
            Copy each word with your finger or a stylus. Nothing is graded.
          </p>
          <WritePractice
            key={language}
            cards={cards.map((c) => ({ id: c.id, payload: c.payload }))}
            language={language}
          />
        </>
      )}
    </main>
  );
}
