"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { type HelpLevel } from "@/lib/help";
import { LANGUAGES, type Language } from "@/lib/languages";
import { HelpSelect } from "./HelpSelect";

/** One help level per language. Each change saves straight away. */
export function SettingsForm(props: { helps: Record<Language, HelpLevel> }) {
  const router = useRouter();
  const [helps, setHelps] = useState(props.helps);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function pick(language: Language, help: HelpLevel) {
    const before = helps[language];
    setHelps((h) => ({ ...h, [language]: help }));
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ language, help }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setHelps((h) => ({ ...h, [language]: before }));
        setMessage(data.error ?? "Something went wrong.");
      } else {
        setMessage("Saved.");
        router.refresh();
      }
    } catch {
      setHelps((h) => ({ ...h, [language]: before }));
      setMessage("Could not reach the server. Check your connection and try again.");
    }
    setBusy(false);
  }

  return (
    <div className="stack">
      {LANGUAGES.map((l) => (
        <div key={l.id} className="card stack">
          <div className="lead">{l.label} lessons</div>
          <HelpSelect value={helps[l.id]} onChange={(v) => void pick(l.id, v)} disabled={busy} />
        </div>
      ))}
      {message && <p className="muted" role="status">{message}</p>}
    </div>
  );
}
