"use client";

import { useState } from "react";

/** Owner only: loads the core 2,000 words of both languages into the lexicon. */
export function SeedLexiconButton() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function seed() {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/admin/lexicon/seed", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string; added?: { es: number; fa: number } };
      if (!res.ok) setError(data.error ?? "Something went wrong.");
      else setMessage(`Added ${data.added?.es ?? 0} Spanish and ${data.added?.fa ?? 0} Farsi words.`);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    }
    setBusy(false);
  }

  return (
    <div className="card stack">
      <div className="lead">Lexicon</div>
      <p className="muted">Our own word list. Every lesson adds to it. Load the core 2,000 words once to start it off.</p>
      <button className="btn secondary" onClick={seed} disabled={busy}>
        {busy ? "Loading…" : "Load the core 2,000 words"}
      </button>
      {message && <p className="muted">{message}</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
