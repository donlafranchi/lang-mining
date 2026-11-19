"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { defaultHelp, isHelpLevel, type HelpLevel } from "@/lib/help";
import { DEFAULT_LANGUAGE, isLanguage, type Language } from "@/lib/languages";
import { DEFAULT_MODEL, isModel, type ModelId } from "@/lib/models";
import { HelpSelect } from "./HelpSelect";
import { LanguageSelect } from "./LanguageSelect";
import { ModelSelect } from "./ModelSelect";

const MODEL_KEY = "lm_model";
const LANGUAGE_KEY = "lm_language";
// Help is remembered per language: a Farsi beginner may want full help and still read Spanish lightly.
const helpKey = (language: Language) => `lm_help_${language}`;

export function PasteForm() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);
  const [helps, setHelps] = useState<Record<Language, HelpLevel>>({ es: defaultHelp("es"), fa: defaultHelp("fa") });
  const [model, setModel] = useState<ModelId>(DEFAULT_MODEL);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Remember the last language and model per device. A convenience only, so failures are ignored.
  useEffect(() => {
    try {
      const savedLanguage = localStorage.getItem(LANGUAGE_KEY);
      // lm_help was the Farsi-only key before Spanish had a level.
      const savedEs = localStorage.getItem(helpKey("es"));
      const savedFa = localStorage.getItem(helpKey("fa")) ?? localStorage.getItem("lm_help");
      const savedModel = localStorage.getItem(MODEL_KEY);
      // Runs once after mount on purpose: reading localStorage during render would break hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (savedLanguage && isLanguage(savedLanguage)) setLanguage(savedLanguage);
      setHelps((h) => ({
        es: savedEs && isHelpLevel(savedEs) ? savedEs : h.es,
        fa: savedFa && isHelpLevel(savedFa) ? savedFa : h.fa,
      }));
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
    setHelps((h) => ({ ...h, [language]: value }));
    try {
      localStorage.setItem(helpKey(language), value);
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
        body: JSON.stringify({ input, language, help: helps[language], model }),
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
      <HelpSelect value={helps[language]} onChange={pickHelp} disabled={busy} />
      <ModelSelect value={model} onChange={pickModel} disabled={busy} />
      {error && <p className="error">{error}</p>}
      <button className="btn" type="submit" disabled={busy || !input.trim()}>
        {busy ? "Saving…" : "Mine it"}
      </button>
    </form>
  );
}
