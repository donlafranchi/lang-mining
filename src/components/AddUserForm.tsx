"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AddUserForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setDone("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, passcode }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
      } else {
        setDone(`Added ${name.trim()}. Tell them the name and password.`);
        setName("");
        setPasscode("");
        router.refresh();
      }
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    }
    setBusy(false);
  }

  return (
    <form className="card stack" onSubmit={submit}>
      <div className="lead">Add a person</div>
      <label className="field">
        Name
        <input
          type="text"
          name="new-person"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="off"
          autoCapitalize="words"
          autoCorrect="off"
          spellCheck={false}
        />
      </label>
      <label className="field">
        Password (at least 6 characters)
        {/* Plain text, not a password field, so your iPhone does not offer to save this person's password as yours. */}
        <input
          type="text"
          name="new-person-secret"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
      </label>
      {error && <p className="error">{error}</p>}
      {done && <p className="muted">{done}</p>}
      <button className="btn" type="submit" disabled={busy || !name.trim() || !passcode}>
        {busy ? "Adding…" : "Add person"}
      </button>
    </form>
  );
}
