"use client";

import { useState } from "react";
import { orderedConjugation } from "@/lib/conjugation-order";
import type { AllTenses } from "@/lib/analysis/contract";
import type { WordRow } from "@/lib/enrichment/rows";
import type { ReflexiveKind, Verb } from "@/lib/enrichment/schema";
import type { Language } from "@/lib/languages";
import { posLabel } from "@/lib/pos-labels";
import { tenseLabel } from "@/lib/tense-labels";
import { verbTags } from "@/lib/verb-meta";
import { SaveAllButton } from "./SaveAllButton";
import { SaveWordButton } from "./SaveWordButton";

const REFLEXIVE_LABELS: Record<ReflexiveKind, string> = {
  reflexive: "Acts on itself",
  meaning_change: "Meaning changes with se",
  reciprocal: "Each other",
  accidental: "Happens to someone",
  impersonal: "Impersonal or passive",
};

/** What a row saves to the study list. */
function savable(row: WordRow) {
  if (row.kind === "word") return row.vocab;
  const v = row.verb;
  return { lemma: v.infinitive, english: v.english, part_of_speech: "verb", example_fragment: v.form_in_source };
}

/**
 * The same layout for every word. Line 1: the form as written, with its kind of word at the right edge. Line 2: the
 * dictionary form and its meaning. Line 3 (when there is any): short tags such as "gerund (-ing)" or "irregular".
 */
function Entry(props: { written: string; lemma: string; english: string; senses?: string[]; pos: string; tags?: string[] }) {
  const meanings = props.senses && props.senses.length > 1 ? props.senses.slice(0, 4).join(", ") : props.english;
  const same = props.written.toLowerCase() === props.lemma.toLowerCase();
  return (
    <div className="word-entry">
      <div className="word-top">
        <span className="lead">{props.written}</span>
        <span className="word-pos">{posLabel(props.pos)}</span>
      </div>
      <div className="word-line">
        {same ? meanings : (
          <>
            {props.lemma} <span className="muted">({meanings})</span>
          </>
        )}
      </div>
      {props.tags && props.tags.length > 0 && <div className="word-line muted">{props.tags.join(" · ")}</div>}
    </div>
  );
}

function Table({ table }: { table: Record<string, string> }) {
  return (
    <table className="conj">
      <tbody>
        {orderedConjugation(table).map(([pronoun, form]) => (
          <tr key={pronoun}>
            <td>{pronoun}</td>
            <td>{form}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Every other tense of the verb, fetched when asked for. */
function MoreForms({ lemma }: { lemma: string }) {
  const [state, setState] = useState<"idle" | "loading" | "failed">("idle");
  const [all, setAll] = useState<AllTenses | null>(null);

  async function load() {
    setState("loading");
    try {
      const res = await fetch(`/api/verbs?lemma=${encodeURIComponent(lemma)}`);
      if (!res.ok) throw new Error("failed");
      setAll((await res.json()) as AllTenses);
    } catch {
      setState("failed");
      return;
    }
    setState("idle");
  }

  if (all) {
    return (
      <div className="stack">
        {all.tenses.map((t) => (
          <details key={`${t.mood}/${t.tense}`} className="item">
            <summary>
              <span className="lead">{tenseLabel(t.mood, t.tense)}</span>
            </summary>
            <div className="body">
              <Table table={t.table} />
            </div>
          </details>
        ))}
      </div>
    );
  }
  return (
    <div className="stack">
      <button type="button" className="btn secondary small" onClick={() => void load()} disabled={state === "loading"}>
        {state === "loading" ? "Loading…" : "More forms"}
      </button>
      {state === "failed" && <p className="muted">The other forms are not available right now.</p>}
    </div>
  );
}

function VerbBody({ verb }: { verb: Verb }) {
  return (
    <div className="stack word-body">
      <Table table={verb.conjugation_table} />
      {verb.reflexive && (
        <div className="card stack">
          <div>
            <span className="lead">{verb.reflexive.infinitive_reflexive}</span> · {verb.reflexive.english}
          </div>
          <div className="muted">{REFLEXIVE_LABELS[verb.reflexive.kind]}</div>
          <div>{verb.reflexive.explanation}</div>
        </div>
      )}
      <MoreForms lemma={verb.infinitive} />
    </div>
  );
}

/**
 * One list of words and verbs. A verb opens to show how it is conjugated in this sentence, with a button for every
 * other form. Every row has an add button, and one at the bottom adds them all.
 */
export function WordList(props: { rows: WordRow[]; sessionId: string; language?: Language; empty?: string }) {
  const language = props.language ?? "es";
  if (props.rows.length === 0) return <p className="muted">{props.empty ?? "No words found in this text."}</p>;
  return (
    <div className="stack">
      <div className="word-list">
        {props.rows.map((row, i) => (
          <div key={i} className="word-row">
            <div className="word-main">
              {row.kind === "word" ? (
                <Entry written={row.vocab.surface_form} lemma={row.vocab.lemma} english={row.vocab.english} senses={row.vocab.senses} pos={row.vocab.part_of_speech} />
              ) : (
                <details className="word-details">
                  <summary>
                    <Entry written={row.verb.form_in_source} lemma={row.verb.infinitive} english={row.verb.english} senses={row.senses} pos="verb" tags={verbTags(row.verb)} />
                  </summary>
                  <VerbBody verb={row.verb} />
                </details>
              )}
            </div>
            <SaveWordButton word={savable(row)} language={language} sessionId={props.sessionId} compact />
          </div>
        ))}
      </div>
      <SaveAllButton words={props.rows.map(savable)} language={language} sessionId={props.sessionId} />
    </div>
  );
}
