"use client";

import { useEffect, useState } from "react";
import { BUILD_ID, needsUpdate } from "@/lib/version";

const CHECK_EVERY_MS = 10 * 60 * 1000;

/** "A new version is ready": shown when the live build differs from the one this phone is running. Update is a reload. */
export function UpdateBanner() {
  const [stale, setStale] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    const check = () => {
      if (document.visibilityState !== "visible") return;
      fetch("/api/version", { cache: "no-store" })
        .then((res) => (res.ok ? (res.json() as Promise<{ id?: string }>) : null))
        .then((data) => {
          if (live && data && needsUpdate(BUILD_ID, data.id)) setStale(true);
        })
        .catch(() => undefined);
    };
    check();
    const timer = setInterval(check, CHECK_EVERY_MS);
    document.addEventListener("visibilitychange", check);
    return () => {
      live = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);

  if (!stale) return null;

  async function update() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      await reg?.update();
    } catch {
      // A reload is all that is needed; the worker is only a bonus.
    }
    window.location.reload();
  }

  return (
    <div className="update-banner" role="status">
      <span>A new version is ready.</span>
      <button type="button" className="btn small" onClick={() => void update()} disabled={busy}>
        {busy ? "Updating…" : "Update"}
      </button>
    </div>
  );
}
