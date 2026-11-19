"use client";

import { HELP_LEVELS, type HelpLevel } from "@/lib/help";

export function HelpSelect(props: { value: HelpLevel; onChange: (value: HelpLevel) => void; disabled?: boolean }) {
  return (
    <label className="field">
      Help level
      <select
        value={props.value}
        onChange={(e) => props.onChange(e.target.value as HelpLevel)}
        disabled={props.disabled}
      >
        {HELP_LEVELS.map((h) => (
          <option key={h.id} value={h.id}>
            {h.label}
          </option>
        ))}
      </select>
    </label>
  );
}
