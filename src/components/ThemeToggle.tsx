"use client";

import { useState, useSyncExternalStore } from "react";
import { THEME_KEY, THEMES, isTheme, type Theme } from "@/lib/theme";

const LABELS: Record<Theme, string> = { system: "Match my phone", light: "Light", dark: "Dark" };

function saved(): Theme {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return isTheme(value) ? value : "system";
  } catch {
    return "system";
  }
}

function apply(theme: Theme) {
  if (theme === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Blocked storage: the choice still applies until the app is closed.
  }
}

/** Light, dark, or match the phone. Applies at once and is remembered on this device. */
export function ThemeToggle() {
  const initial = useSyncExternalStore(
    () => () => undefined,
    saved,
    () => "system" as Theme,
  );
  const [choice, setChoice] = useState<Theme | null>(null);
  const current = choice ?? initial;

  return (
    <div className="card stack">
      <div className="lead">Appearance</div>
      <div className="tabs theme-tabs" role="tablist" aria-label="Appearance">
        {THEMES.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={current === t}
            onClick={() => {
              apply(t);
              setChoice(t);
            }}
          >
            {LABELS[t]}
          </button>
        ))}
      </div>
    </div>
  );
}

/** A menu row that flips between light and dark. */
export function ThemeMenuItem() {
  const [dark, setDark] = useState<boolean | null>(null);
  const isDark = () =>
    document.documentElement.dataset.theme === "dark" ||
    (document.documentElement.dataset.theme !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  return (
    <button
      type="button"
      className="menu-item"
      onClick={() => {
        const next: Theme = isDark() ? "light" : "dark";
        apply(next);
        setDark(next === "dark");
      }}
    >
      {dark === null ? "Switch light / dark" : dark ? "Switch to light mode" : "Switch to dark mode"}
    </button>
  );
}
