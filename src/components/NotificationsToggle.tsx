"use client";

import { useState, useSyncExternalStore } from "react";

function keyBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const raw = atob((base64Url + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Turns "tell me when a lesson is ready" on or off for this phone. The permission prompt has to come from this tap. */
export function NotificationsToggle(props: { publicKey: string | null; initiallyOn: boolean }) {
  // null while rendering on the server, then whether this browser can do push at all.
  const supported = useSyncExternalStore(
    () => () => undefined,
    () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window,
    () => null,
  );
  const [on, setOn] = useState(props.initiallyOn);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  if (!props.publicKey) return null;

  async function turnOn() {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setMessage("Notifications are blocked. Allow them for this app in the iPhone Settings, then try again.");
      return;
    }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(props.publicKey!) });
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subscription: sub.toJSON() }),
    });
    if (!res.ok) {
      await sub.unsubscribe().catch(() => undefined);
      throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Something went wrong.");
    }
    setOn(true);
    setMessage("On. You will get a notification when a lesson is ready.");
  }

  async function turnOff() {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
      await sub.unsubscribe().catch(() => undefined);
    }
    setOn(false);
    setMessage("Off.");
  }

  async function toggle() {
    setBusy(true);
    setMessage("");
    try {
      await (on ? turnOff() : turnOn());
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
    setBusy(false);
  }

  return (
    <div className="card stack">
      <div className="lead">Notifications</div>
      {supported === false ? (
        <p className="muted">On iPhone, add this app to your Home Screen (Share, then Add to Home Screen), open it from there, and come back here.</p>
      ) : (
        <>
          <p className="muted">Get a notification on this phone when a lesson finishes.</p>
          <button type="button" onClick={() => void toggle()} disabled={busy || supported === null}>
            {on ? "Turn off notifications" : "Turn on notifications"}
          </button>
        </>
      )}
      {message && <p className="muted" role="status">{message}</p>}
    </div>
  );
}
