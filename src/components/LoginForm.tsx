"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm(props: { firstRun: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, passcode }),
      });
      if (res.ok) {
        router.replace("/");
        router.refresh();
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Could not sign in.");
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    }
    setBusy(false);
  }

  return (
    <form className="stack" onSubmit={submit}>
      {props.firstRun && (
        <p className="muted">
          First time here. Type the name you want and the passcode you have been using. That creates the owner account,
          and you can add other people from the Admin page.
        </p>
      )}
      <label className="field">
        Name
        <input
          type="text"
          autoComplete="username"
          autoCapitalize="words"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </label>
      <label className="field">
        Passcode
        <input type="password" autoComplete="current-password" value={passcode} onChange={(e) => setPasscode(e.target.value)} />
      </label>
      {error && <p className="error">{error}</p>}
      <button className="btn" type="submit" disabled={busy || !name.trim() || !passcode}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
