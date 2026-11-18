"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Deletes a lesson after a confirm. With redirectTo it navigates there afterwards, otherwise it refreshes the page in place. */
export function DeleteButton(props: { id: string; redirectTo?: string; label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (!window.confirm("Delete this lesson? This cannot be undone.")) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/sessions/${props.id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setBusy(false);
        return;
      }
      if (props.redirectTo) router.push(props.redirectTo);
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setBusy(false);
    }
  }

  if (props.label) {
    return (
      <div className="stack">
        <button className="btn secondary" onClick={remove} disabled={busy}>
          {busy ? "Deleting…" : props.label}
        </button>
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  return (
    <>
      <button className="row-delete" onClick={remove} disabled={busy} aria-label="Delete lesson" title="Delete lesson">
        {busy ? "…" : "✕"}
      </button>
      {error && <span className="error">{error}</span>}
    </>
  );
}
