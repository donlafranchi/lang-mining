"use client";

import { orderedConjugation } from "@/lib/conjugation-order";
import {
  allFarsiIdioms,
  allFarsiVerbs,
  allFarsiWords,
} from "@/lib/enrichment/flatten";
import type {
  FarsiEnrichment,
  FarsiIdiom,
  FarsiVerb,
  FarsiWord,
} from "@/lib/enrichment/farsi-schema";
import {
  farsiGlosses,
  interlinear,
  farsiParagraphRows,
  type FarsiRow,
} from "@/lib/enrichment/farsi-rows";
import { lessonPatterns, patternById } from "@/lib/patterns";
import { pickFarsiQuestions } from "@/lib/test-me";
import { posLabel } from "@/lib/pos-labels";
import { TappableParagraph } from "./TappableParagraph";
import { KnownPatterns } from "./PatternCard";
import { PatternRows } from "./PatternSheet";
import { TestMe } from "./TestMe";
import { Pager } from "./Pager";
import { SaveAllButton } from "./SaveAllButton";
import { SaveWordButton } from "./SaveWordButton";

export type FarsiTab = "read" | "vocab" | "idioms" | "verbs";

function Fa({ children }: { children: React.ReactNode }) {
  return (
    <span dir="rtl" lang="fa" className="fa">
      {children}
    </span>
  );
}

function Empty({ what }: { what: string }) {
  return <p className="muted">No {what} found in this text.</p>;
}

export function FarsiLesson({
  e,
  tab,
  sessionId,
  seenPatterns,
  coreRanks,
  coreForms,
}: {
  e: FarsiEnrichment;
  tab: FarsiTab;
  sessionId: string;
  /** Pattern ids this person has already been shown. */
  seenPatterns: string[];
  coreRanks: Record<string, number>;
  coreForms: Record<string, number>;
}) {
  if (tab === "read")
    return (
      <Reader
        e={e}
        sessionId={sessionId}
        seenPatterns={seenPatterns}
        coreRanks={coreRanks}
        coreForms={coreForms}
      />
    );
  if (tab === "vocab") {
    const words = allFarsiWords(e);
    return (
      <div className="stack">
        <SaveAllButton words={words} language="fa" sessionId={sessionId} />
        <WordList items={words} sessionId={sessionId} coreRanks={coreRanks} />
      </div>
    );
  }
  if (tab === "idioms") return <IdiomList items={allFarsiIdioms(e)} />;
  return <VerbList items={allFarsiVerbs(e)} />;
}

function Reader({
  e,
  sessionId,
  seenPatterns,
  coreRanks,
  coreForms,
}: {
  e: FarsiEnrichment;
  sessionId: string;
  seenPatterns: string[];
  coreRanks: Record<string, number>;
  coreForms: Record<string, number>;
}) {
  const patterns = lessonPatterns(e.paragraphs);
  const pages = e.paragraphs.map((p, i) => {
    // Only patterns this person has not been shown are listed, so a known one never nags.
    const fresh = (p.patterns ?? []).filter(
      (u) => patternById(u.id) && !seenPatterns.includes(u.id),
    );
    const freshUses = fresh.filter(
      (u, k) => fresh.findIndex((x) => x.id === u.id) === k,
    );
    const rows = farsiParagraphRows(p.persian, p.words, p.verbs);
    return (
      <div key={i} className="stack">
        <div className="card stack">
          <div className="para-fa">
            <Fa>
              <TappableParagraph
                text={p.persian}
                forms={coreForms}
                marks={fresh}
                language="fa"
                glosses={farsiGlosses(rows)}
                sessionId={sessionId}
              />
            </Fa>
          </div>
          <div className="translit">{p.transliteration}</div>
          <div
            className="interlinear"
            dir="rtl"
            lang="fa"
            aria-label="Word by word"
          >
            {interlinear(p.persian, farsiGlosses(rows)).map((w, k) => (
              <span key={k} className="il-word">
                <span className="il-fa">{w.word}</span>
                <span className="il-en" dir="ltr">
                  {w.gloss ?? "·"}
                </span>
              </span>
            ))}
          </div>
          <div className="muted small-hint">Tap any word for its meaning.</div>
        </div>

        {p.idioms.length > 0 && (
          <div className="stack">
            <div className="section-label">Idioms</div>
            <IdiomList items={p.idioms} />
          </div>
        )}

        <div className="stack">
          <div className="section-label">Vocabulary</div>
          <FarsiWordList rows={rows} sessionId={sessionId} />
        </div>

        <PatternRows uses={freshUses} language="fa" />

        <details className="item">
          <summary>
            <span className="lead">English</span>
          </summary>
          <div className="body stack">
            <div className="para-en">{p.english}</div>
            <div>
              <span className="muted">Key phrase: </span>
              <Fa>{p.key_phrase.persian}</Fa>{" "}
              <span className="translit">{p.key_phrase.transliteration}</span>{" "}
              <span className="muted">· {p.key_phrase.english}</span>
            </div>
          </div>
        </details>
        <TestMe
          key={i}
          lang="fa"
          questions={pickFarsiQuestions(rows, coreRanks)}
        />
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
      <Pager pages={pages} label="Sentence" />
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

const savableFa = (row: FarsiRow) =>
  row.kind === "word"
    ? row.word
    : {
        lemma: row.verb.infinitive,
        english: row.verb.english,
        part_of_speech: "verb",
        transliteration: row.verb.transliteration,
        example_fragment: "",
      };

/** Same layout as the Spanish word list: form as written, kind of word, dictionary form with its meaning, verbs open to a table. */
function FarsiEntry(props: {
  written: string;
  translit: string;
  lemma: string;
  lemmaTranslit?: string;
  english: string;
  senses?: string[];
  pos: string;
  tags?: string[];
  irregular?: boolean;
}) {
  const meanings =
    props.senses && props.senses.length > 1
      ? props.senses.slice(0, 4).join(", ")
      : props.english;
  const same = props.written === props.lemma;
  const tags = props.tags ?? [];
  return (
    <div className="word-entry">
      <div className="word-top">
        <span className="lead">
          <Fa>{props.written}</Fa>
        </span>{" "}
        <span className="translit">{props.translit}</span>{" "}
        <span className="word-pos">
          {posLabel(props.pos)}
          {props.irregular ? " (irregular)" : ""}
        </span>
      </div>
      <div className="word-line">
        {same ? (
          meanings
        ) : (
          <>
            <Fa>{props.lemma}</Fa> <span className="muted">({meanings})</span>
          </>
        )}
      </div>
      {tags.length > 0 && (
        <div className="word-line muted">{tags.join(" · ")}</div>
      )}
    </div>
  );
}

function FarsiWordList({
  rows,
  sessionId,
}: {
  rows: FarsiRow[];
  sessionId: string;
}) {
  if (rows.length === 0) return <Empty what="words" />;
  return (
    <div className="stack">
      <div className="word-list">
        {rows.map((row, i) => {
          const add = (
            <SaveWordButton
              word={savableFa(row)}
              language="fa"
              sessionId={sessionId}
              compact
            />
          );
          if (row.kind === "word") {
            const w = row.word;
            return (
              <div key={i} className="word-row">
                <div className="word-main">
                  <FarsiEntry
                    written={w.surface}
                    translit={w.transliteration}
                    lemma={w.lemma}
                    english={w.english}
                    senses={w.senses}
                    pos={w.part_of_speech}
                  />
                </div>
                <div className="word-side">{add}</div>
              </div>
            );
          }
          const v = row.verb;
          return (
            <details key={i} className="word-details">
              <summary className="word-row">
                <div className="word-main">
                  <FarsiEntry
                    written={v.form_in_source}
                    translit={v.form_transliteration}
                    lemma={v.infinitive}
                    english={v.english}
                    senses={row.senses}
                    pos="verb"
                    tags={[v.tense, v.person].filter(Boolean)}
                    irregular={v.irregular}
                  />
                </div>
                <div className="word-side">
                  <span onClick={(ev) => ev.preventDefault()}>{add}</span>
                  <span className="word-arrow" aria-hidden="true" />
                </div>
              </summary>
              <div className="stack word-body">
                <table className="conj">
                  <tbody>
                    {orderedConjugation(v.conjugation_table).map(
                      ([pronoun, form]) => (
                        <tr key={pronoun}>
                          <td>
                            <Fa>{pronoun}</Fa>
                          </td>
                          <td>
                            <Fa>{form}</Fa>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
                {v.compound && (
                  <div className="card stack">
                    <div className="lead">Compound verb</div>
                    <div>{v.compound.parts}</div>
                    <div>{v.compound.explanation}</div>
                  </div>
                )}
              </div>
            </details>
          );
        })}
      </div>
      <SaveAllButton
        words={rows.map(savableFa)}
        language="fa"
        sessionId={sessionId}
      />
    </div>
  );
}

/** One line per word so a long list is quick to scan: script, how to say it, what it means. */
function WordList({
  items,
  sessionId,
  coreRanks,
}: {
  items: FarsiWord[];
  sessionId: string;
  coreRanks: Record<string, number>;
}) {
  if (items.length === 0) return <Empty what="words" />;
  return (
    <div className="word-list">
      {items.map((w, i) => (
        <div key={i} className="word-row">
          <div className="word-main">
            <div>
              <span className="lead">
                <Fa>{w.lemma}</Fa>
              </span>
              {w.surface !== w.lemma && (
                <span className="muted">
                  {" "}
                  (as written <Fa>{w.surface}</Fa>)
                </span>
              )}{" "}
              <span className="translit">{w.transliteration}</span>
            </div>
            <div className="muted">
              {coreRanks[w.lemma] ? (
                <span className="pill">core #{coreRanks[w.lemma]}</span>
              ) : null}{" "}
              {w.english} · {w.part_of_speech}
              {w.register !== "neutral" ? ` · ${w.register}` : ""} · {w.level}
            </div>
            {w.senses && w.senses.length > 1 && (
              <div className="muted">
                Could also mean: {w.senses.slice(1).join("; ")}. Which fits
                here?
              </div>
            )}
          </div>
          <SaveWordButton
            word={w}
            language="fa"
            sessionId={sessionId}
            compact
          />
        </div>
      ))}
    </div>
  );
}

function IdiomList({ items }: { items: FarsiIdiom[] }) {
  if (items.length === 0) return <Empty what="idioms" />;
  return (
    <div className="stack">
      {items.map((x, i) => (
        <details key={i} className="item">
          <summary>
            <span className="lead">
              <Fa>{x.phrase}</Fa>
            </span>
            <span className="pill">{x.register}</span>
          </summary>
          <div className="body">
            <div className="translit">{x.transliteration}</div>
            <div>
              <span className="muted">Means: </span>
              {x.actual_meaning}
            </div>
            <div className="muted">Literally: {x.literal_meaning}</div>
          </div>
        </details>
      ))}
    </div>
  );
}

function VerbList({ items }: { items: FarsiVerb[] }) {
  if (items.length === 0) return <Empty what="verbs" />;
  return (
    <div className="stack">
      {items.map((v, i) => (
        <details key={i} className="item">
          <summary>
            <span>
              <span className="lead">
                <Fa>{v.form_in_source}</Fa>
              </span>{" "}
              · {v.form_english}
            </span>
            <span className="pills">
              {v.compound && <span className="pill">compound</span>}
              {v.irregular && <span className="pill">irregular</span>}
            </span>
          </summary>
          <div className="body">
            <div className="translit">{v.form_transliteration}</div>
            <div>
              <span className="lead">
                <Fa>{v.infinitive}</Fa>
              </span>{" "}
              · {v.english}{" "}
              <span className="translit">({v.transliteration})</span>
            </div>
            <div className="muted">
              {v.tense} · {v.mood} · {v.person}
            </div>
            <table className="conj">
              <tbody>
                {orderedConjugation(v.conjugation_table).map(
                  ([pronoun, form]) => (
                    <tr key={pronoun}>
                      <td>
                        <Fa>{pronoun}</Fa>
                      </td>
                      <td>
                        <Fa>{form}</Fa>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
            {v.compound && (
              <div className="card stack">
                <div className="lead">Compound verb</div>
                <div>{v.compound.parts}</div>
                <div>{v.compound.explanation}</div>
              </div>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}
