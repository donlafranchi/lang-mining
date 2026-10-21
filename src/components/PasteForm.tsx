"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DIALECTS, type Dialect } from "@/lib/enrichment/schema";
import { DialectSelect } from "./DialectSelect";

const DIALECT_KEY = "lm_dialect";

function isDialect(value: string): value is Dialect {
  return (DIALECTS as readonly string[]).includes(value);
}

export function PasteForm() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [dialect, setDialect] = useState<Dialect>("puerto_rican");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Remember the last dialect per device. A convenience only, so failures are ignored.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DIALECT_KEY);
      // Runs once after mount on purpose: reading localStorage during render would break hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved && isDialect(saved)) setDialect(saved);
    } catch {}
  }, []);

  function pickDialect(value: Dialect) {
    setDialect(value);
    try {
      localStorage.setItem(DIALECT_KEY, value);
    } catch {}
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input, dialect }),
      });
      const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok || !data.id) {
        setError(data.error ?? "Something went wrong.");
        setBusy(false);
        return;
      }
      router.push(`/sessions/${data.id}`);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <form className="stack" onSubmit={submit}>
      <label className="field">
        Spanish text or a link
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste an article link or some Spanish text"
          inputMode="text"
          autoCapitalize="none"
          disabled={busy}
        />
      </label>
      <DialectSelect value={dialect} onChange={pickDialect} />
      {error && <p className="error">{error}</p>}
      <button className="btn" type="submit" disabled={busy || !input.trim()}>
        {busy ? "Mining… this can take up to a minute" : "Mine it"}
      </button>
    </form>
  );
}
