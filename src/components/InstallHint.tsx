"use client";

import { useEffect, useState } from "react";
import { installHint, isIos } from "@/lib/install";

const DISMISSED_KEY = "lm_install_dismissed";

// Chrome's install prompt event. Not in the standard DOM types.
type InstallPromptEvent = Event & { prompt: () => Promise<unknown> };

/** Helps install the app. iPhone Safari has no prompt, so it gets the steps. Dismissible and never shown in the installed app. */
export function InstallHint() {
  const [state, setState] = useState({ standalone: true, dismissed: true, ios: false });
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISSED_KEY) === "1";
    } catch {}
    // Runs once after mount on purpose: reading the browser during render would break hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ standalone, dismissed, ios: isIos(navigator.userAgent, navigator.platform, navigator.maxTouchPoints) });

    function onPrompt(e: Event) {
      e.preventDefault();
      setPromptEvent(e as InstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const hint = installHint({ ...state, canPrompt: promptEvent !== null });
  if (!hint) return null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {}
    setState((s) => ({ ...s, dismissed: true }));
  }

  async function install() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    setPromptEvent(null);
  }

  return (
    <div className="card stack install-hint" role="note">
      <div className="lead">Install Hand to Brain</div>
      {hint === "prompt" ? (
        <>
          <p className="muted">Add it to your home screen to open it like an app, full screen.</p>
          <button className="btn" onClick={install}>
            Install
          </button>
        </>
      ) : (
        <p className="muted">
          Tap the Share button in Safari, then “Add to Home Screen”, to open it like an app, full screen.
        </p>
      )}
      <button className="btn secondary small" onClick={dismiss}>
        Not now
      </button>
    </div>
  );
}
