"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DEFAULT_HELP, isHelpLevel, type HelpLevel } from "@/lib/help";
import { DEFAULT_LANGUAGE, isLanguage, type Language } from "@/lib/languages";
import { DEFAULT_MODEL, isModel, type ModelId } from "@/lib/models";
import { HelpSelect } from "./HelpSelect";
import { LanguageSelect } from "./LanguageSelect";
import { ModelSelect } from "./ModelSelect";

const MODEL_KEY = "lm_model";
const LANGUAGE_KEY = "lm_language";
const HELP_KEY = "lm_help";

export function PasteForm() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);
  const [help, setHelp] = useState<HelpLevel>(DEFAULT_HELP);
  const [model, setModel] = useState<ModelId>(DEFAULT_MODEL);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Remember the last language and model per device. A convenience only, so failures are ignored.
  useEffect(() => {
    try {
      const savedLanguage = localStorage.getItem(LANGUAGE_KEY);
      const savedHelp = localStorage.getItem(HELP_KEY);
      const savedModel = localStorage.getItem(MODEL_KEY);
      // Runs once after mount on purpose: reading localStorage during render would break hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (savedLanguage && isLanguage(savedLanguage)) setLanguage(savedLanguage);
      if (savedHelp && isHelpLevel(savedHelp)) setHelp(savedHelp);
      if (savedModel && isModel(savedModel)) setModel(savedModel);
    } catch {}
  }, []);

  function pickLanguage(value: Language) {
    setLanguage(value);
    try {
      localStorage.setItem(LANGUAGE_KEY, value);
    } catch {}
  }

  function pickHelp(value: HelpLevel) {
    setHelp(value);
    try {
      localStorage.setItem(HELP_KEY, value);
    } catch {}
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
        body: JSON.stringify({ input, language, help, model }),
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
      {language === "fa" && <HelpSelect value={help} onChange={pickHelp} disabled={busy} />}
      <ModelSelect value={model} onChange={pickModel} disabled={busy} />
      {error && <p className="error">{error}</p>}
      <button className="btn" type="submit" disabled={busy || !input.trim()}>
        {busy ? "Saving…" : "Mine it"}
      </button>
    </form>
  );
}
