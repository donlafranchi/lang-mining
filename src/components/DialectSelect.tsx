"use client";

import { DIALECTS, DIALECT_LABELS, type Dialect } from "@/lib/enrichment/schema";

export function DialectSelect(props: {
  value: Dialect;
  onChange: (value: Dialect) => void;
  label?: string;
}) {
  return (
    <label className="field">
      {props.label ?? "Dialect"}
      <select value={props.value} onChange={(e) => props.onChange(e.target.value as Dialect)}>
        {DIALECTS.map((d) => (
          <option key={d} value={d}>
            {DIALECT_LABELS[d]}
          </option>
        ))}
      </select>
    </label>
  );
}
