"use client";

import { useState } from "react";
import { toDeckPayload } from "@/lib/deck-payload";
import type { Language } from "@/lib/languages";

type Word = Parameters<typeof toDeckPayload>[0];

/** Saves a vocab entry to the deck. Saving the same word again is harmless. */
export function SaveWordButton(props: { word: Word; language: Language; sessionId: string; compact?: boolean }) {
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");

  async function save() {
    setState("saving");
    setError("");
    try {
      const res = await fetch("/api/deck", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          language: props.language,
          payload: toDeckPayload(props.word),
          sessionId: props.sessionId,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setState("idle");
        return;
      }
      setState("saved");
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setState("idle");
    }
  }

  if (props.compact) {
    return (
      <button
        className="row-delete"
        onClick={save}
        disabled={state !== "idle"}
        aria-label={state === "saved" ? "Saved to deck" : "Save to deck"}
        title={error || (state === "saved" ? "Saved to deck" : "Save to deck")}
      >
        {state === "saved" ? "✓" : state === "saving" ? "…" : error ? "!" : "＋"}
      </button>
    );
  }

  return (
    <div className="stack">
      <button className="btn secondary small" onClick={save} disabled={state !== "idle"}>
        {state === "saved" ? "Saved to deck ✓" : state === "saving" ? "Saving…" : "＋ Save to deck"}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
