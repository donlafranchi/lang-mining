"use client";

import { allIdioms } from "@/lib/enrichment/flatten";
import { paragraphRows, type WordRow } from "@/lib/enrichment/rows";
import type { Enrichment, Idiom } from "@/lib/enrichment/schema";
import { lessonPatterns, patternById } from "@/lib/patterns";
import { HighlightedText } from "./HighlightedText";
import { KnownPatterns } from "./PatternCard";
import { PatternRows } from "./PatternSheet";
import { TestMe } from "./TestMe";
import { pickQuestions } from "@/lib/test-me";
import { RemoveParagraph } from "./RemoveParagraph";
import { Pager } from "./Pager";
import { WordList } from "./WordList";

export type SpanishTab = "read" | "vocab" | "idioms" | "verbs";

function Empty({ what }: { what: string }) {
  return <p className="muted">No {what} found in this text.</p>;
}

export function SpanishLesson({
  e,
  tab,
  sessionId,
  seenPatterns,
  coreRanks,
  coreForms,
  canEdit,
}: {
  e: Enrichment;
  tab: SpanishTab;
  sessionId: string;
  canEdit?: boolean;
  /** Pattern ids this person has already been shown. */
  seenPatterns: string[];
  coreRanks: Record<string, number>;
  coreForms: Record<string, number>;
}) {
  if (tab === "read") return <Reader e={e} sessionId={sessionId} seenPatterns={seenPatterns} coreRanks={coreRanks} coreForms={coreForms} canEdit={canEdit} />;
  if (tab === "vocab") return <WordList rows={lessonRows(e)} sessionId={sessionId} />;
  if (tab === "idioms") return <IdiomList items={allIdioms(e)} />;
  return <WordList rows={lessonRows(e)} sessionId={sessionId} />;
}

function Reader({
  e,
  sessionId,
  seenPatterns,
  coreRanks,
  coreForms,
  canEdit,
}: {
  e: Enrichment;
  sessionId: string;
  seenPatterns: string[];
  coreRanks: Record<string, number>;
  coreForms: Record<string, number>;
  canEdit?: boolean;
}) {
  const patterns = lessonPatterns(e.paragraphs);
  const pages = e.paragraphs.map((p, i) => {
    // Only patterns this person has not been shown are highlighted, so a known one never nags.
    const fresh = (p.patterns ?? []).filter((u) => patternById(u.id) && !seenPatterns.includes(u.id));
    const freshUses = fresh.filter((u, k) => fresh.findIndex((x) => x.id === u.id) === k);
    return (
      <div key={i} className="stack">
        <div className="card para-es">
          <HighlightedText text={p.spanish} forms={coreForms} marks={fresh} />
        </div>
        {canEdit && <RemoveParagraph sessionId={sessionId} index={i} />}
        {p.idioms.length > 0 && (
          <div className="stack">
            <div className="section-label">Idioms</div>
            <IdiomList items={p.idioms} />
          </div>
        )}
        <div className="stack">
          <div className="section-label">Vocabulary</div>
          <WordList rows={paragraphRows(p.spanish, p.vocab, p.verbs)} sessionId={sessionId} />
        </div>
        <PatternRows uses={freshUses} language="es" />
        <details className="item">
          <summary>
            <span className="lead">English</span>
          </summary>
          <div className="body stack">
            <div className="para-en">{p.english}</div>
            <div>
              <span className="muted">Key phrase: </span>
              {p.key_phrase.spanish} <span className="muted">· {p.key_phrase.english}</span>
            </div>
          </div>
        </details>
        <TestMe key={i} questions={pickQuestions(paragraphRows(p.spanish, p.vocab, p.verbs), coreRanks)} />
      </div>
    );
  });

  return (
    <div className="stack">
      <details className="item">
        <summary>
          <span className="lead">English Overview</span>
        </summary>
        <div className="body">{e.summary}</div>
      </details>
      <Pager pages={pages} label="Paragraph" />
      <KnownPatterns patterns={patterns} seen={seenPatterns} />
      {e.grammar_notes.length > 0 && (
        <details className="item">
          <summary>
            <span className="lead">Grammar notes</span>
          </summary>
          <div className="body stack">
            {e.grammar_notes.map((n, i) => (
              <p key={i}>{n}</p>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function Tags({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="tags">
      {items.map((t) => (
        <span key={t} className="pill">
          {t}
        </span>
      ))}
    </div>
  );
}

function IdiomList({ items }: { items: Idiom[] }) {
  if (items.length === 0) return <Empty what="idioms" />;
  return (
    <div className="stack">
      {items.map((x, i) => (
        <details key={i} className="item">
          <summary>
            <span className="lead">{x.phrase}</span>
            <span className="pill">{x.register}</span>
          </summary>
          <div className="body">
            <div>
              <span className="muted">Means: </span>
              {x.actual_meaning}
            </div>
            <div className="muted">Literally: {x.literal_meaning}</div>
            <Tags items={x.region_tags} />
          </div>
        </details>
      ))}
    </div>
  );
}

/** Every word and verb in the lesson as one list, each shown once. */
function lessonRows(e: Enrichment): WordRow[] {
  const seen = new Set<string>();
  return e.paragraphs
    .flatMap((p) => paragraphRows(p.spanish, p.vocab, p.verbs))
    .filter((r) => {
      const key = r.kind === "word" ? `w|${r.vocab.lemma.toLowerCase()}` : `v|${r.verb.infinitive.toLowerCase()}|${r.verb.form_in_source.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
