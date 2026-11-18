"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Enrichment, ReflexiveKind } from "@/lib/enrichment/schema";
import type { SessionRow } from "@/lib/sessions";
import { DEFAULT_MODEL, modelLabel, type ModelId } from "@/lib/models";
import { STALE_AFTER_MS } from "@/lib/status";
import { ModelSelect } from "./ModelSelect";

type Tab = "read" | "vocab" | "idioms" | "verbs";
const TABS: { id: Tab; label: string }[] = [
  { id: "read", label: "Read" },
  { id: "vocab", label: "Vocab" },
  { id: "idioms", label: "Idioms" },
  { id: "verbs", label: "Verbs" },
];

export function SessionView(props: {
  session: SessionRow;
  enrichment: Enrichment | null;
  model: string | null;
  sourceAvailable: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("read");
  const [model, setModel] = useState<ModelId>(DEFAULT_MODEL);
  const [busy, setBusy] = useState(false);
  const [rerunStartedAt, setRerunStartedAt] = useState<number | null>(null);
  const [error, setError] = useState("");

  const enrichment = props.enrichment;
  const initialBuild = props.session.status === "processing";
  const rerunning = rerunStartedAt !== null && !enrichment;
  const waiting = !enrichment && (initialBuild || rerunning);

  // The lesson builds in the background, so check back until it appears.
  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(() => {
      if (rerunStartedAt !== null && Date.now() - rerunStartedAt > STALE_AFTER_MS) {
        setRerunStartedAt(null);
        setError("That build did not finish. Try again.");
        return;
      }
      router.refresh();
    }, 4000);
    return () => clearInterval(timer);
  }, [waiting, rerunStartedAt, router]);

  async function build() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/sessions/${props.session.id}/rerun`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
      } else {
        setRerunStartedAt(Date.now());
        router.refresh();
      }
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    }
    setBusy(false);
  }

  return (
    <div className="stack">
      {!enrichment && (
        <div className="card stack">
          {waiting ? (
            <p className="muted">
              Building your lesson. You can leave this page, it will show up under Recent when it is ready.
            </p>
          ) : props.session.status === "failed" ? (
            <p className="error">{props.session.error ?? "This lesson did not finish building."}</p>
          ) : (
            <p className="muted">This lesson has not been built yet.</p>
          )}
          {props.sourceAvailable ? (
            !waiting && (
              <>
                <ModelSelect value={model} onChange={setModel} disabled={busy} />
                <button className="btn" onClick={build} disabled={busy}>
                  {busy
                    ? "Starting…"
                    : props.session.status === "failed"
                      ? "Try again"
                      : "Build lesson"}
                </button>
              </>
            )
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
          {props.model && <p className="muted">Built with {modelLabel(props.model)}.</p>}
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

function VerbsTab({ e }: { e: Enrichment }) {
  if (e.verbs.length === 0) return <Empty what="verbs" />;
  return (
    <div className="stack">
      {e.verbs.map((v, i) => (
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
