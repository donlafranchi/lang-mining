"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DEFAULT_MODEL, isModel, type ModelId } from "@/lib/models";
import { ModelSelect } from "./ModelSelect";

const MODEL_KEY = "lm_model";

export function PasteForm() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [model, setModel] = useState<ModelId>(DEFAULT_MODEL);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Remember the last model per device. A convenience only, so failures are ignored.
  useEffect(() => {
    try {
      const savedModel = localStorage.getItem(MODEL_KEY);
      // Runs once after mount on purpose: reading localStorage during render would break hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (savedModel && isModel(savedModel)) setModel(savedModel);
    } catch {}
  }, []);

  function pickModel(value: ModelId) {
    setModel(value);
    try {
      localStorage.setItem(MODEL_KEY, value);
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
        body: JSON.stringify({ input, model }),
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
      <ModelSelect value={model} onChange={pickModel} disabled={busy} />
      {error && <p className="error">{error}</p>}
      <button className="btn" type="submit" disabled={busy || !input.trim()}>
        {busy ? "Saving…" : "Mine it"}
      </button>
    </form>
  );
}
