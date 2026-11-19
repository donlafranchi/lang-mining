"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { helpLabel, type HelpLevel } from "@/lib/help";
import { type Language } from "@/lib/languages";
import { LANGUAGE_COOKIE } from "@/lib/language-cookie";
import { DEFAULT_MODEL, isModel, type ModelId } from "@/lib/models";
import { LanguageSelect } from "./LanguageSelect";
import { ModelSelect } from "./ModelSelect";

const MODEL_KEY = "lm_model";

/** helps is the person's saved help level per language (Settings), used for every lesson they mine. */
export function PasteForm(props: { helps: Record<Language, HelpLevel>; initialLanguage: Language }) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState<Language>(props.initialLanguage);
  const [model, setModel] = useState<ModelId>(DEFAULT_MODEL);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Remember the last language and model per device. A convenience only, so failures are ignored.
  useEffect(() => {
    try {
      const savedModel = localStorage.getItem(MODEL_KEY);
      // Runs once after mount on purpose: reading localStorage during render would break hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (savedModel && isModel(savedModel)) setModel(savedModel);
    } catch {}
  }, []);

  function pickLanguage(value: Language) {
    setLanguage(value);
    // A cookie, so the server can open Deck, Quiz and the rest in the same language.
    document.cookie = `${LANGUAGE_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`;
  }

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
        body: JSON.stringify({ input, language, model }),
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
      <LanguageSelect value={language} onChange={pickLanguage} disabled={busy} />
      <label className="field">
        {language === "fa" ? "Farsi" : "Spanish"} text or a link
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Paste an article link or some ${language === "fa" ? "Farsi" : "Spanish"} text`}
          dir="auto"
          inputMode="text"
          autoCapitalize="none"
          disabled={busy}
        />
      </label>
      <p className="muted">
        Help: {helpLabel(props.helps[language])} · <Link href="/settings">change in Settings</Link>
      </p>
      <ModelSelect value={model} onChange={pickModel} disabled={busy} />
      {error && <p className="error">{error}</p>}
      <button className="btn" type="submit" disabled={busy || !input.trim()}>
        {busy ? "Saving…" : "Mine it"}
      </button>
    </form>
  );
}
