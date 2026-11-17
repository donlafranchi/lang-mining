"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function UnlockPage() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/unlock", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ passcode }),
    });
    if (res.ok) {
      router.replace("/");
      router.refresh();
      return;
    }
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setError(data.error ?? "Could not unlock.");
    setBusy(false);
  }

  return (
    <main className="shell">
      <div className="brand">
        <h1>lang-mining</h1>
      </div>
      <form className="stack" onSubmit={submit}>
        <label className="field">
          Passcode
          <input
            type="password"
            autoComplete="current-password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            autoFocus
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn" type="submit" disabled={busy || !passcode}>
          {busy ? "Unlocking…" : "Unlock"}
        </button>
      </form>
    </main>
  );
}
