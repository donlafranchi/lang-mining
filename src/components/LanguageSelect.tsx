"use client";

import { LANGUAGES, type Language } from "@/lib/languages";

export function LanguageSelect(props: { value: Language; onChange: (value: Language) => void; disabled?: boolean }) {
  return (
    <label className="field">
      Language
      <select
        value={props.value}
        onChange={(e) => props.onChange(e.target.value as Language)}
        disabled={props.disabled}
      >
        {LANGUAGES.map((l) => (
          <option key={l.id} value={l.id}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
