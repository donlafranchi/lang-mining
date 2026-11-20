"use client";

import { useState } from "react";

/** Builds the lesson as one HTML file and opens the phone's share sheet (AirDrop, Messages, Mail, Files). Falls back to a download. */
export function ShareButton({ id, title }: { id: string; title: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function share() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/sessions/${id}/share`);
      if (!res.ok) throw new Error("failed");
      const blob = await res.blob();
      const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? "lesson.html";
      const file = new File([blob], name, { type: "text/html" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      // Closing the share sheet is not an error.
      if (!(err instanceof DOMException && err.name === "AbortError")) setError("Could not make the file. Try again.");
    }
    setBusy(false);
  }

  return (
    <div className="stack">
      <button type="button" className="btn secondary" onClick={() => void share()} disabled={busy}>
        {busy ? "Making the file…" : "Share as a file"}
      </button>
      <p className="muted">One page that opens offline in Safari. Share it with people you know. It holds the article text.</p>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
