"use client";

import { useEffect } from "react";

/** Registers the service worker. Production only, so local development is never served stale files. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Not fatal: the app works the same without it, just with no offline screen.
    });
  }, []);
  return null;
}
