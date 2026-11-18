import type { FarsiEnrichment } from "@/lib/enrichment/farsi-schema";

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

export function FarsiLesson({ e, tab }: { e: FarsiEnrichment; tab: FarsiTab }) {
  if (tab === "read") return <ReadTab e={e} />;
  if (tab === "vocab") return <VocabTab e={e} />;
  if (tab === "idioms") return <IdiomsTab e={e} />;
  return <VerbsTab e={e} />;
}

function ReadTab({ e }: { e: FarsiEnrichment }) {
  return (
    <div className="stack">
      <div className="card">{e.summary}</div>
      {e.segments.map((s, i) => (
        <div key={i} className="card segment">
          <div className="es">
            <Fa>{s.persian}</Fa>
          </div>
          <div className="translit">{s.transliteration}</div>
          <div className="en">{s.english}</div>
        </div>
      ))}
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

function VocabTab({ e }: { e: FarsiEnrichment }) {
  if (e.vocab.length === 0) return <Empty what="vocabulary" />;
  return (
    <div className="stack">
      {e.vocab.map((v, i) => (
        <details key={i} className="item">
          <summary>
            <span>
              <span className="lead">
                <Fa>{v.lemma}</Fa>
              </span>{" "}
              · {v.english}
            </span>
            <span className="pill">{v.level}</span>
          </summary>
          <div className="body">
            <div className="translit">{v.transliteration}</div>
            <div className="muted">
              {v.part_of_speech} · {v.register}
            </div>
            <div>
              “<Fa>{v.example_fragment}</Fa>”
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}

function IdiomsTab({ e }: { e: FarsiEnrichment }) {
  if (e.idioms.length === 0) return <Empty what="idioms" />;
  return (
    <div className="stack">
      {e.idioms.map((x, i) => (
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

function VerbsTab({ e }: { e: FarsiEnrichment }) {
  if (e.verbs.length === 0) return <Empty what="verbs" />;
  return (
    <div className="stack">
      {e.verbs.map((v, i) => (
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
