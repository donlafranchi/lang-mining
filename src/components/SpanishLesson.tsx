"use client";

import Link from "next/link";
import { allIdioms, allVerbs, allVocab, keyWords } from "@/lib/enrichment/flatten";
import type { Enrichment, Idiom, ReflexiveKind, Verb, Vocab } from "@/lib/enrichment/schema";
import { lessonPatterns, patternById, patternKind } from "@/lib/patterns";
import { HighlightedText } from "./HighlightedText";
import { KnownPatterns } from "./PatternCard";
import { Pager } from "./Pager";
import { SaveAllButton } from "./SaveAllButton";
import { SaveWordButton } from "./SaveWordButton";

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
}: {
  e: Enrichment;
  tab: SpanishTab;
  sessionId: string;
  /** Pattern ids this person has already been shown. */
  seenPatterns: string[];
  coreRanks: Record<string, number>;
  coreForms: Record<string, number>;
}) {
  if (tab === "read") return <Reader e={e} sessionId={sessionId} seenPatterns={seenPatterns} coreRanks={coreRanks} coreForms={coreForms} />;
  if (tab === "vocab") {
    const words = allVocab(e);
    return (
      <div className="stack">
        <SaveAllButton words={words} language="es" sessionId={sessionId} />
        <VocabList items={words} sessionId={sessionId} coreRanks={coreRanks} />
      </div>
    );
  }
  if (tab === "idioms") return <IdiomList items={allIdioms(e)} />;
  return <VerbList items={allVerbs(e)} />;
}

function Reader({
  e,
  sessionId,
  seenPatterns,
  coreRanks,
  coreForms,
}: {
  e: Enrichment;
  sessionId: string;
  seenPatterns: string[];
  coreRanks: Record<string, number>;
  coreForms: Record<string, number>;
}) {
  const patterns = lessonPatterns(e.paragraphs);
  const words = keyWords(e, coreRanks);
  const pages = e.paragraphs.map((p, i) => {
    // Only patterns this person has not been shown are highlighted, so a known one never nags.
    const fresh = (p.patterns ?? []).filter((u) => patternById(u.id) && !seenPatterns.includes(u.id));
    const freshIds = [...new Set(fresh.map((u) => u.id))];
    return (
      <div key={i} className="stack">
        <div className="card para-es">
          <HighlightedText text={p.spanish} forms={coreForms} marks={fresh} />
        </div>
        {p.vocab.length > 0 && (
          <div className="stack">
            <div className="section-label">Vocabulary</div>
            <SaveAllButton words={p.vocab} language="es" sessionId={sessionId} />
            <VocabList items={p.vocab} sessionId={sessionId} coreRanks={coreRanks} />
          </div>
        )}
        {p.verbs.length > 0 && (
          <div className="stack">
            <div className="section-label">Verbs</div>
            <VerbList items={p.verbs} />
          </div>
        )}
        {freshIds.length > 0 && (
          <div className="new-patterns">
            <span className="section-label">New to you</span>
            {freshIds.map((id) => (
              <Link key={id} href={`/study/patterns?language=es#${id}`} className={`mark mark-${patternKind(id)}`}>
                {patternById(id)!.title.replace(/ \(.*\)$/, "")}
              </Link>
            ))}
          </div>
        )}
        {p.idioms.length > 0 && (
          <div className="stack">
            <div className="section-label">Idioms</div>
            <IdiomList items={p.idioms} />
          </div>
        )}
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
      </div>
    );
  });

  return (
    <div className="stack">
      {words.length > 0 && (
        <div className="key-words" aria-label="Key words">
          {words.map((v) => (
            <span key={v.lemma} className="pill">
              {v.lemma} · {v.english}
            </span>
          ))}
        </div>
      )}
      <details className="item">
        <summary>
          <span className="lead">Overview in English</span>
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

/** One line per word so a long list is quick to scan, with a save button on each. */
function VocabList({ items, sessionId, coreRanks }: { items: Vocab[]; sessionId: string; coreRanks: Record<string, number> }) {
  if (items.length === 0) return <Empty what="vocabulary" />;
  return (
    <div className="word-list">
      {items.map((v, i) => (
        <div key={i} className="word-row">
          <div className="word-main">
            <div>
              <span className="lead">{v.lemma}</span>
              {v.surface_form.toLowerCase() !== v.lemma.toLowerCase() && (
                <span className="muted"> (as written {v.surface_form})</span>
              )}{" "}
              · {v.english}
            </div>
            <div className="muted">
              {coreRanks[v.lemma] ? <span className="pill">core #{coreRanks[v.lemma]}</span> : null}{" "}
              {v.part_of_speech} · {v.level}
              {v.example_fragment ? ` · “${v.example_fragment}”` : ""}
            </div>
            {v.senses && v.senses.length > 1 && (
              <div className="muted">Could also mean: {v.senses.slice(1).join("; ")}. Which fits here?</div>
            )}
          </div>
          <SaveWordButton word={v} language="es" sessionId={sessionId} compact />
        </div>
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

const REFLEXIVE_LABELS: Record<ReflexiveKind, string> = {
  reflexive: "Acts on itself",
  meaning_change: "Meaning changes with se",
  reciprocal: "Each other",
  accidental: "Happens to someone",
  impersonal: "Impersonal or passive",
};

function VerbList({ items }: { items: Verb[] }) {
  if (items.length === 0) return <Empty what="verbs" />;
  return (
    <div className="stack">
      {items.map((v, i) => (
        <details key={i} className="item">
          <summary>
            <span>
              <span className="lead">{v.form_in_source}</span> · {v.form_english}
            </span>
            <span className="pills">
              {v.reflexive && <span className="pill">se</span>}
              {v.irregular && <span className="pill">irregular</span>}
            </span>
          </summary>
          <div className="body">
            <div>
              <span className="lead">{v.infinitive}</span> · {v.english}
            </div>
            <div className="muted">
              {v.tense} · {v.mood} · {v.person}
            </div>
            <table className="conj">
              <tbody>
                {Object.entries(v.conjugation_table).map(([pronoun, form]) => (
                  <tr key={pronoun}>
                    <td>{pronoun}</td>
                    <td>{form}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {v.reflexive && (
              <div className="card stack">
                <div>
                  <span className="lead">{v.reflexive.infinitive_reflexive}</span> · {v.reflexive.english}
                </div>
                <div className="muted">{REFLEXIVE_LABELS[v.reflexive.kind]}</div>
                <div>{v.reflexive.explanation}</div>
              </div>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}
