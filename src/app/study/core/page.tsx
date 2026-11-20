import Link from "next/link";
import { SaveAllButton } from "@/components/SaveAllButton";
import { SwipeNav } from "@/components/SwipeNav";
import { SaveWordButton } from "@/components/SaveWordButton";
import { requireUser } from "@/lib/auth";
import { coreBatch, coreProgress, coreToPayload, coreWords } from "@/lib/core";
import { listDeckKeys } from "@/lib/deck";
import { LANGUAGES } from "@/lib/languages";
import { preferredLanguage } from "@/lib/language-pref";

export const dynamic = "force-dynamic";

export default async function CorePage(props: PageProps<"/study/core">) {
  const user = await requireUser();
  const sp = await props.searchParams;
  const language = await preferredLanguage(sp.language);

  let keys = new Set<string>();
  let setupError = "";
  try {
    keys = await listDeckKeys(user.id, language);
  } catch (err) {
    setupError =
      err instanceof Error ? err.message : "Could not load your deck.";
  }
  const progress = coreProgress(coreWords(language), keys);
  const percent = Math.round((progress.inDeck / progress.total) * 100);

  // Which twenty to show: from a rank onward, content words only unless asked for everything.
  const startParam = Number(Array.isArray(sp.start) ? sp.start[0] : sp.start);
  const start = Number.isInteger(startParam) && startParam > 0 ? startParam : 1;
  const batch = coreBatch(coreWords(language), keys, { start });
  const here = (extra: { start?: number }) => {
    const q = new URLSearchParams({ language });
    if (extra.start && extra.start > 1) q.set("start", String(extra.start));
    return `/study/core?${q.toString()}`;
  };
  const nextHref =
    batch.nextStart !== null ? here({ start: batch.nextStart }) : null;
  const prevHref =
    batch.prevStart !== null ? here({ start: batch.prevStart }) : null;

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
          <Link
            key={l.id}
            className={l.id === language ? "btn" : "btn secondary"}
            href={`/study/core?language=${l.id}`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <p className="muted core-intro">
        The 2,000 most common words. Know these and you can get by; the rest you
        pick up from what you read.
      </p>
      {setupError && <p className="error">{setupError}</p>}
      <div className="card stack">
        <div className="lead">
          {progress.inDeck} of {progress.total} in your deck ({percent}%)
        </div>
        <progress
          value={progress.inDeck}
          max={progress.total}
          aria-label="Core words in your deck"
        />
      </div>

      {batch.words.length > 0 ? (
        <SwipeNav nextHref={nextHref} prevHref={prevHref}>
          <div className="stack">
            <div className="section-label">
              Nouns, verbs, adjectives and adverbs
              {batch.words[0].rank > 1 ? ` · from #${batch.words[0].rank}` : ""}
            </div>
            <SaveAllButton
              key={start}
              words={batch.words.map(coreToPayload)}
              language={language}
              label={`＋ Add these ${batch.words.length} to my deck`}
              refresh
            />
            <div className="word-list">
              {batch.words.map((w) => (
                <div key={w.rank} className="word-row">
                  <div className="word-main">
                    <div>
                      <span className="muted">#{w.rank} </span>
                      <span className="lead" dir="auto">
                        {w.lemma}
                      </span>
                      {w.transliteration && (
                        <span className="translit"> {w.transliteration}</span>
                      )}
                      {" · "}
                      {w.english}
                    </div>
                    <div className="muted">{w.part_of_speech}</div>
                  </div>
                  <SaveWordButton
                    word={coreToPayload(w)}
                    language={language}
                    compact
                  />
                </div>
              ))}
            </div>
            <div className="deck-links">
              {prevHref && (
                <Link className="btn secondary" href={prevHref}>
                  ← Previous 20
                </Link>
              )}
              {nextHref && (
                <Link className="btn secondary" href={nextHref}>
                  Next 20 →
                </Link>
              )}
            </div>
            <p className="muted small">
              Swipe right for the next 20, left to go back.
            </p>
            <form className="stack" action="/study/core" method="get">
              <input type="hidden" name="language" value={language} />
              <label className="field-label" htmlFor="core-start">
                Start at word number
              </label>
              <div className="deck-links">
                <input
                  id="core-start"
                  name="start"
                  type="number"
                  min={1}
                  max={2000}
                  inputMode="numeric"
                  defaultValue={start > 1 ? start : undefined}
                  placeholder="e.g. 300"
                />
                <button className="btn secondary" type="submit">
                  Go
                </button>
              </div>
            </form>
          </div>
        </SwipeNav>
      ) : (
        <div className="stack">
          <p className="card">
            {progress.inDeck === progress.total
              ? "All 2,000 are in your deck."
              : "Nothing more to offer from here."}
          </p>
          {start > 1 && (
            <Link className="btn secondary" href={here({})}>
              ← Back to the top
            </Link>
          )}
        </div>
      )}
    </main>
  );
}
