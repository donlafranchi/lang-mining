"use client";

import { useState } from "react";
import { toDeckPayload } from "@/lib/deck-payload";
import { MAX_SAVE_BATCH } from "@/lib/deck-limits";
import type { Language } from "@/lib/languages";

type Word = Parameters<typeof toDeckPayload>[0];

/** Saves a whole list of words to the deck in one tap. Words already saved are skipped. */
export function SaveAllButton(props: { words: Word[]; language: Language; sessionId: string; label?: string }) {
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");

  async function saveAll() {
    setState("saving");
    setError("");
    let created = 0;
    try {
      for (let i = 0; i < props.words.length; i += MAX_SAVE_BATCH) {
        const chunk = props.words.slice(i, i + MAX_SAVE_BATCH);
        const res = await fetch("/api/deck", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            language: props.language,
            payloads: chunk.map(toDeckPayload),
            sessionId: props.sessionId,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string; created?: number };
        if (!res.ok) {
          setError(data.error ?? "Something went wrong.");
          setState("idle");
          return;
        }
        created += data.created ?? 0;
      }
      const already = props.words.length - created;
      setSummary(already > 0 ? `Saved ${created} new, ${already} already in your deck.` : `Saved ${created} words.`);
      setState("saved");
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setState("idle");
    }
  }

  if (props.words.length === 0) return null;

  return (
    <div className="stack">
      <button className="btn secondary small" onClick={saveAll} disabled={state !== "idle"}>
        {state === "saving"
          ? "Saving…"
          : state === "saved"
            ? "Saved ✓"
            : (props.label ?? `＋ Save all ${props.words.length} words`)}
      </button>
      {state === "saved" && <p className="muted">{summary}</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
