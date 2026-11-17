"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DIALECT_LABELS, type Dialect, type Enrichment } from "@/lib/enrichment/schema";
import type { SessionRow } from "@/lib/sessions";
import { DialectSelect } from "./DialectSelect";

type Tab = "read" | "vocab" | "idioms" | "verbs";
const TABS: { id: Tab; label: string }[] = [
  { id: "read", label: "Read" },
  { id: "vocab", label: "Vocab" },
  { id: "idioms", label: "Idioms" },
  { id: "verbs", label: "Verbs" },
];

export function SessionView(props: {
  session: SessionRow;
  enrichments: Partial<Record<Dialect, Enrichment>>;
  sourceAvailable: boolean;
}) {
  const router = useRouter();
  const [dialect, setDialect] = useState<Dialect>(props.session.dialect);
  const [tab, setTab] = useState<Tab>("read");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const enrichment = props.enrichments[dialect];

  async function build() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/sessions/${props.session.id}/rerun`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dialect }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
      } else {
        router.refresh();
      }
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    }
    setBusy(false);
  }

  return (
    <div className="stack">
      <DialectSelect value={dialect} onChange={setDialect} />

      {!enrichment && (
        <div className="card stack">
          {props.session.status === "failed" || props.session.status === "processing" ? (
            <p className="error">
              {props.session.error ?? "This lesson did not finish building."}
            </p>
          ) : (
            <p className="muted">No {DIALECT_LABELS[dialect]} version of this lesson yet.</p>
          )}
          {props.sourceAvailable ? (
            <button className="btn" onClick={build} disabled={busy}>
              {busy ? "Building… up to a minute" : `Build ${DIALECT_LABELS[dialect]} version`}
            </button>
          ) : (
            <p className="muted">
              The source text was deleted after the retention window. Paste it again to build a new lesson.
            </p>
          )}
          {error && <p className="error">{error}</p>}
        </div>
      )}

      {enrichment && (
        <>
          {enrichment.detected_dialect !== dialect && (
            <p className="muted">
              The source reads as {DIALECT_LABELS[enrichment.detected_dialect]}. Notes below are framed for{" "}
              {DIALECT_LABELS[dialect]}.
            </p>
          )}
          <div className="tabs" role="tablist">
            {TABS.map((t) => (
              <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
          {tab === "read" && <ReadTab e={enrichment} />}
          {tab === "vocab" && <VocabTab e={enrichment} />}
          {tab === "idioms" && <IdiomsTab e={enrichment} />}
          {tab === "verbs" && <VerbsTab e={enrichment} />}
        </>
      )}
    </div>
  );
}

function Empty({ what }: { what: string }) {
  return <p className="muted">No {what} found in this text.</p>;
}

function ReadTab({ e }: { e: Enrichment }) {
  return (
    <div className="stack">
      <div className="card">{e.summary}</div>
      {e.segments.map((s, i) => (
        <div key={i} className="card segment">
          <div className="es">{s.spanish}</div>
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

function VocabTab({ e }: { e: Enrichment }) {
  if (e.vocab.length === 0) return <Empty what="vocabulary" />;
  return (
    <div className="stack">
      {e.vocab.map((v, i) => (
        <details key={i} className="item">
          <summary>
            <span>
              <span className="lead">{v.lemma}</span> · {v.english}
            </span>
            <span className="pill">{v.level}</span>
          </summary>
          <div className="body">
            <div className="muted">
              {v.surface_form} · {v.part_of_speech}
            </div>
            <div>“{v.example_fragment}”</div>
            <Tags items={v.dialect_tags} />
          </div>
        </details>
      ))}
    </div>
  );
}

function IdiomsTab({ e }: { e: Enrichment }) {
  if (e.idioms.length === 0) return <Empty what="idioms" />;
  return (
    <div className="stack">
      {e.idioms.map((x, i) => (
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
            {x.similar_in_other_dialects && <div>{x.similar_in_other_dialects}</div>}
            <Tags items={x.region_tags} />
          </div>
        </details>
      ))}
    </div>
  );
}

function VerbsTab({ e }: { e: Enrichment }) {
  if (e.verbs.length === 0) return <Empty what="verbs" />;
  return (
    <div className="stack">
      {e.verbs.map((v, i) => (
        <details key={i} className="item">
          <summary>
            <span>
              <span className="lead">{v.form_in_source}</span> → {v.infinitive}
            </span>
            {v.irregular && <span className="pill">irregular</span>}
          </summary>
          <div className="body">
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
            {v.dialect_note && <div>{v.dialect_note}</div>}
          </div>
        </details>
      ))}
    </div>
  );
}
