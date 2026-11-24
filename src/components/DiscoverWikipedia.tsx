"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { THEMES } from "@/lib/discover-themes";
import type { Language } from "@/lib/languages";
import type { WikiItem } from "@/lib/wikipedia";

/** Find something to read on Wikipedia: a random article, or a search. Mining takes the opening of the article. */
export function DiscoverWikipedia({ language }: { language: Language }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<WikiItem[] | null>(null);
  const [theme, setTheme] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const dir = language === "fa" ? "rtl" : "ltr";

  async function find(query: string, themeId?: string) {
    setBusy("find");
    setTheme(themeId ?? null);
    setError("");
    try {
      const res = await fetch(
        `/api/discover/wikipedia?${new URLSearchParams(themeId ? { language, theme: themeId } : { language, q: query })}`,
      );
      const data = (await res.json().catch(() => ({}))) as {
        items?: WikiItem[];
        error?: string;
      };
      if (!res.ok || !data.items)
        throw new Error(data.error ?? "Something went wrong.");
      setItems(data.items);
      if (data.items.length === 0) setError("Nothing found. Try other words.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not reach the server.",
      );
    }
    setBusy(null);
  }

  async function mine(title: string) {
    setBusy(title);
    setError("");
    try {
      const res = await fetch("/api/discover/mine", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ language, title }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        id?: string;
        error?: string;
      };
      if (!res.ok || !data.id)
        throw new Error(data.error ?? "Something went wrong.");
      router.push(`/sessions/${data.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not reach the server.",
      );
      setBusy(null);
    }
  }

  return (
    <div className="stack">
      <div className="field-label">Themes</div>
      <div className="stack">
        {THEMES[language].map((t) => (
          <button
            key={t.id}
            type="button"
            className={theme === t.id ? "btn" : "btn secondary"}
            onClick={() => void find("", t.id)}
            disabled={busy !== null}
          >
            {t.label}
            <span className="rate-hint">{t.blurb}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        className="btn secondary"
        onClick={() => void find("")}
        disabled={busy !== null}
      >
        {busy === "find" ? "Looking…" : "Surprise me"}
      </button>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) void find(q);
        }}
      >
        <label className="field" htmlFor="wiki-q">
          Or search a topic
        </label>
        <div className="deck-links">
          <input
            id="wiki-q"
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={language === "fa" ? "e.g. موسیقی" : "e.g. cocina"}
            dir="auto"
            autoCapitalize="none"
          />
          <button
            className="btn secondary"
            type="submit"
            disabled={busy !== null || !q.trim()}
          >
            Search
          </button>
        </div>
      </form>
      {error && <p className="error">{error}</p>}
      {items && items.length > 0 && (
        <div className="word-list">
          {items.map((it) => (
            <div key={it.title} className="word-row">
              <div className="word-main">
                <div className="word-entry">
                  <div className="lead" dir={dir} lang={language}>
                    {it.title}
                  </div>
                  {it.preview && (
                    <div className="word-line muted" dir={dir} lang={language}>
                      {it.preview}
                    </div>
                  )}
                </div>
              </div>
              <div className="word-side">
                <button
                  type="button"
                  className="btn small"
                  onClick={() => void mine(it.title)}
                  disabled={busy !== null}
                >
                  {busy === it.title ? "Starting…" : "Mine it"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="muted">
        Mining uses the first few paragraphs of the article, so lessons stay
        short.
      </p>
    </div>
  );
}
