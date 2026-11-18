"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RemoveCardButton(props: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (!window.confirm("Remove this word from the deck?")) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/deck/${props.id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setBusy(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <>
      <button className="row-delete" onClick={remove} disabled={busy} aria-label="Remove word" title="Remove word">
        {busy ? "…" : "✕"}
      </button>
      {error && <span className="error">{error}</span>}
    </>
  );
}
