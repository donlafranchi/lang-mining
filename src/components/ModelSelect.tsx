"use client";

import { MODELS, type ModelId } from "@/lib/models";

export function ModelSelect(props: { value: ModelId; onChange: (value: ModelId) => void; disabled?: boolean }) {
  return (
    <label className="field">
      Model
      <select
        value={props.value}
        onChange={(e) => props.onChange(e.target.value as ModelId)}
        disabled={props.disabled}
      >
        {MODELS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>
    </label>
  );
}
