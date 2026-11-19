"use client";

import { LANGUAGES, type Language } from "@/lib/languages";

/** Big buttons to flip between languages, instead of a dropdown. */
export function LanguageSelect(props: { value: Language; onChange: (value: Language) => void; disabled?: boolean }) {
  return (
    <div className="stack">
      <div className="field-label" id="language-label">
        Language
      </div>
      <div className="tabs lang-tabs" role="tablist" aria-labelledby="language-label">
        {LANGUAGES.map((l) => (
          <button
            key={l.id}
            type="button"
            role="tab"
            aria-selected={props.value === l.id}
            onClick={() => props.onChange(l.id)}
            disabled={props.disabled}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}
