"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Underlining the 2,000 most common words can feel like a lot, so each person can switch it off. */
export function UnderlineToggle(props: { initiallyOn: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(props.initiallyOn);

  function toggle() {
    const next = !on;
    document.cookie = `lm_underline=${next ? "on" : "off"}; path=/; max-age=31536000; samesite=lax`;
    setOn(next);
    router.refresh();
  }

  return (
    <div className="card stack">
      <div className="lead">Underline common words</div>
      <p className="muted">A fine dotted line under words from the 2,000 most common.</p>
      <button type="button" className="btn secondary" onClick={toggle}>
        {on ? "Turn off underlines" : "Turn on underlines"}
      </button>
    </div>
  );
}
