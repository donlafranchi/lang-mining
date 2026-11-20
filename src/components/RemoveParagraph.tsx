"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Owner only: take a paragraph out of the lesson, and teach the site to skip that line from now on. Asks first. */
export function RemoveParagraph(props: { sessionId: string; index: number }) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function remove() {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(`/api/sessions/${props.sessionId}/remove-paragraph`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ index: props.index }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMessage(data.error ?? "Something went wrong.");
        setBusy(false);
        return;
      }
      router.refresh();
    } catch {
      setMessage("Could not reach the server. Check your connection and try again.");
    }
    setBusy(false);
    setAsking(false);
  }

  if (!asking) {
    return (
      <button type="button" className="link-button" onClick={() => setAsking(true)}>
        Not part of the article
      </button>
    );
  }
  return (
    <div className="stack">
      <p className="muted">Remove this paragraph, and skip lines like it on this site from now on?</p>
      <div className="deck-links">
        <button type="button" className="btn small" onClick={() => void remove()} disabled={busy}>
          {busy ? "Removing…" : "Remove"}
        </button>
        <button type="button" className="btn secondary small" onClick={() => setAsking(false)} disabled={busy}>
          Cancel
        </button>
      </div>
      {message && <p className="error">{message}</p>}
    </div>
  );
}
