"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MAX_TITLE_CHARS } from "@/lib/titles";

/** The lesson's title with a way to change it. */
export function RenameTitle(props: { id: string; title: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(props.title);
  const [title, setTitle] = useState(props.title);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/sessions/${props.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: value }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; title?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
      } else {
        setTitle(data.title ?? value);
        setEditing(false);
        router.refresh();
      }
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    }
    setBusy(false);
  }

  if (!editing) {
    return (
      <div className="stack">
        <h1 dir="auto">{title}</h1>
        <button
          className="link-button"
          onClick={() => {
            setValue(title);
            setEditing(true);
          }}
        >
          Rename
        </button>
      </div>
    );
  }

  return (
    <form className="stack" onSubmit={save}>
      <label className="field">
        Title
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={MAX_TITLE_CHARS}
          dir="auto"
          autoFocus
          autoComplete="off"
        />
      </label>
      {error && <p className="error">{error}</p>}
      <div className="title-actions">
        <button type="button" className="btn secondary small" onClick={() => setEditing(false)} disabled={busy}>
          Cancel
        </button>
        <button type="submit" className="btn small" disabled={busy || !value.trim()}>
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
