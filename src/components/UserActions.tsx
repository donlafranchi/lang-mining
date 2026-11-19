"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Reset a passcode or remove a person. Both ask first. */
export function UserActions(props: { id: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function call(url: string, init: RequestInit, success: string) {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(url, init);
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMessage(data.error ?? "Something went wrong.");
      } else {
        setMessage(success);
        router.refresh();
      }
    } catch {
      setMessage("Could not reach the server. Check your connection and try again.");
    }
    setBusy(false);
  }

  function reset() {
    const passcode = window.prompt(`New passcode for ${props.name} (at least 6 characters). This signs them out everywhere.`);
    if (!passcode) return;
    void call(
      `/api/admin/users/${props.id}/passcode`,
      { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ passcode }) },
      "Passcode changed.",
    );
  }

  function remove() {
    if (!window.confirm(`Remove ${props.name}? This also deletes all of their lessons and their deck. It cannot be undone.`)) return;
    void call(`/api/admin/users/${props.id}`, { method: "DELETE" }, "Removed.");
  }

  return (
    <span className="user-actions">
      <button className="link-button" onClick={reset} disabled={busy}>
        New passcode
      </button>
      <button className="link-button danger" onClick={remove} disabled={busy}>
        Remove
      </button>
      {message && <span className="muted">{message}</span>}
    </span>
  );
}
