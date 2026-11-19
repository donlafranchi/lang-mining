"use client";

import { allFarsiIdioms, allFarsiVerbs, allFarsiWords } from "@/lib/enrichment/flatten";
import type { FarsiEnrichment, FarsiIdiom, FarsiVerb, FarsiWord } from "@/lib/enrichment/farsi-schema";
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

export function FarsiLesson({ e, tab, sessionId }: { e: FarsiEnrichment; tab: FarsiTab; sessionId: string }) {
  if (tab === "read") return <Reader e={e} sessionId={sessionId} />;
  if (tab === "vocab") {
    const words = allFarsiWords(e);
    return (
      <div className="stack">
        <SaveAllButton words={words} language="fa" sessionId={sessionId} />
        <WordList items={words} sessionId={sessionId} />
      </div>
    );
  }
  if (tab === "idioms") return <IdiomList items={allFarsiIdioms(e)} />;
  return <VerbList items={allFarsiVerbs(e)} />;
}

function Reader({ e, sessionId }: { e: FarsiEnrichment; sessionId: string }) {
  const pages = e.paragraphs.map((p, i) => (
    <div key={i} className="stack">
      <div className="card stack">
        <div className="para-fa">
          <Fa>{p.persian}</Fa>
        </div>
        <div className="translit">{p.transliteration}</div>
      </div>

      <div className="card stack">
        <div className="lead">Key phrase</div>
        <div>
          <Fa>{p.key_phrase.persian}</Fa>
        </div>
        <div className="translit">{p.key_phrase.transliteration}</div>
        <div className="muted">{p.key_phrase.english}</div>
      </div>

      {p.words.length > 0 && (
        <div className="stack">
          <div className="section-label">Words ({p.words.length})</div>
          <SaveAllButton words={p.words} language="fa" sessionId={sessionId} />
          <WordList items={p.words} sessionId={sessionId} />
        </div>
      )}

      {p.verbs.length > 0 && (
        <div className="stack">
          <div className="section-label">Verbs</div>
          <VerbList items={p.verbs} />
        </div>
      )}

      {p.idioms.length > 0 && (
        <div className="stack">
          <div className="section-label">Idioms</div>
          <IdiomList items={p.idioms} />
        </div>
      )}

      <div className="card para-en">{p.english}</div>
    </div>
  ));

  return (
    <div className="stack">
      <div className="card">{e.summary}</div>
      <Pager pages={pages} label="Paragraph" />
      {e.grammar_notes.length > 0 && (
        <div className="card stack">
          <div className="lead">Grammar notes</div>
          {e.grammar_notes.map((n, i) => (
            <p key={i}>{n}</p>
          ))}
        </div>
      )}
    </div>
  );
}

/** One line per word so a long list is quick to scan: script, how to say it, what it means. */
function WordList({ items, sessionId }: { items: FarsiWord[]; sessionId: string }) {
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
              {w.english} · {w.part_of_speech}
              {w.register !== "neutral" ? ` · ${w.register}` : ""} · {w.level}
            </div>
          </div>
          <SaveWordButton word={w} language="fa" sessionId={sessionId} compact />
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
              · {v.english} <span className="translit">({v.transliteration})</span>
            </div>
            <div className="muted">
              {v.tense} · {v.mood} · {v.person}
            </div>
            <table className="conj">
              <tbody>
                {Object.entries(v.conjugation_table).map(([pronoun, form]) => (
                  <tr key={pronoun}>
                    <td>
                      <Fa>{pronoun}</Fa>
                    </td>
                    <td>
                      <Fa>{form}</Fa>
                    </td>
                  </tr>
                ))}
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
