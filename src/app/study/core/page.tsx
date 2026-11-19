import Link from "next/link";
import { SaveAllButton } from "@/components/SaveAllButton";
import { SaveWordButton } from "@/components/SaveWordButton";
import { requireUser } from "@/lib/auth";
import { coreProgress, coreToPayload, coreWords } from "@/lib/core";
import { listDeckKeys } from "@/lib/deck";
import { LANGUAGES, resolveLanguage } from "@/lib/languages";

export const dynamic = "force-dynamic";

export default async function CorePage(props: PageProps<"/study/core">) {
  const user = await requireUser();
  const sp = await props.searchParams;
  const language = resolveLanguage(Array.isArray(sp.language) ? sp.language[0] : sp.language);

  let keys = new Set<string>();
  let setupError = "";
  try {
    keys = await listDeckKeys(user.id, language);
  } catch (err) {
    setupError = err instanceof Error ? err.message : "Could not load your deck.";
  }
  const progress = coreProgress(coreWords(language), keys);
  const percent = Math.round((progress.inDeck / progress.total) * 100);

  return (
    <main className="shell">
      <Link href="/study" className="back">
        ← Study
      </Link>
      <div className="brand">
        <h1>Core 2,000</h1>
      </div>
      <nav className="deck-links" aria-label="Language">
        {LANGUAGES.map((l) => (
          <Link key={l.id} className={l.id === language ? "btn" : "btn secondary"} href={`/study/core?language=${l.id}`}>
            {l.label}
          </Link>
        ))}
      </nav>
      <p className="muted">
        The 2,000 most common words. Know these and you can get by; the rest you pick up from what you read.
      </p>
      {setupError && <p className="error">{setupError}</p>}
      <div className="card stack">
        <div className="lead">
          {progress.inDeck} of {progress.total} in your deck ({percent}%)
        </div>
        <progress value={progress.inDeck} max={progress.total} aria-label="Core words in your deck" />
      </div>

      {progress.next.length > 0 ? (
        <div className="stack">
          <div className="section-label">Next up</div>
          <SaveAllButton
            key={progress.next[0].rank}
            words={progress.next.map(coreToPayload)}
            language={language}
            label={`＋ Add these ${progress.next.length} to my deck`}
            refresh
          />
          <div className="word-list">
            {progress.next.map((w) => (
              <div key={w.rank} className="word-row">
                <div className="word-main">
                  <div>
                    <span className="muted">#{w.rank} </span>
                    <span className="lead" dir="auto">
                      {w.lemma}
                    </span>
                    {w.transliteration && <span className="translit"> {w.transliteration}</span>}
                    {" · "}
                    {w.english}
                  </div>
                  <div className="muted">{w.part_of_speech}</div>
                </div>
                <SaveWordButton word={coreToPayload(w)} language={language} compact />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="card">All 2,000 are in your deck.</p>
      )}
    </main>
  );
}
