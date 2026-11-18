"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Lesson } from "@/lib/enrichment/enrich";
import type { FarsiEnrichment } from "@/lib/enrichment/farsi-schema";
import type { Enrichment } from "@/lib/enrichment/schema";
import type { SessionRow } from "@/lib/sessions";
import { DEFAULT_MODEL, modelLabel, type ModelId } from "@/lib/models";
import { STALE_AFTER_MS } from "@/lib/status";
import { FarsiLesson } from "./FarsiLesson";
import { ModelSelect } from "./ModelSelect";
import { SpanishLesson } from "./SpanishLesson";

type Tab = "read" | "vocab" | "idioms" | "verbs";
const TABS: { id: Tab; label: string }[] = [
  { id: "read", label: "Read" },
  { id: "vocab", label: "Vocab" },
  { id: "idioms", label: "Idioms" },
  { id: "verbs", label: "Verbs" },
];

export function SessionView(props: {
  session: SessionRow;
  enrichment: Lesson | null;
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
              The source text for this lesson is not available. Paste it again to build a new lesson.
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
          {props.session.language === "fa" ? (
            <FarsiLesson e={enrichment as FarsiEnrichment} tab={tab} />
          ) : (
            <SpanishLesson e={enrichment as Enrichment} tab={tab} />
          )}
        </>
      )}
    </div>
  );
}
