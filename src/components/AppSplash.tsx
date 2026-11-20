"use client";

import { useSyncExternalStore } from "react";

/**
 * The loading screen for opening the app. It is part of the page's HTML, so it shows the moment the page arrives
 * (after the launch picture iOS shows first) and goes as soon as the app's code has started. It is not shown when moving
 * between views inside the app, because the layout does not reload then. A style rule hides it after a few seconds
 * whatever happens, so it can never trap someone behind it.
 */
export function AppSplash() {
  const started = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  if (started) return null;
  return (
    <div className="app-splash" role="status" aria-live="polite">
      <h1>Hand to Brain</h1>
      <p className="muted">a language learning app</p>
      <div className="app-splash-emoji" aria-hidden="true">
        🤦
      </div>
    </div>
  );
}
