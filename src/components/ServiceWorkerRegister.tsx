"use client";

import { useEffect } from "react";

/** Registers the service worker. Production only, so local development is never served stale files. */
export function ServiceWorkerRegister() {
  // Opening the app clears the red number on its icon.
  useEffect(() => {
    const clear = () => {
      if (document.visibilityState === "visible" && "clearAppBadge" in navigator) void navigator.clearAppBadge().catch(() => undefined);
    };
    clear();
    document.addEventListener("visibilitychange", clear);
    return () => document.removeEventListener("visibilitychange", clear);
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Not fatal: the app works the same without it, just with no offline screen.
    });
  }, []);
  return null;
}
