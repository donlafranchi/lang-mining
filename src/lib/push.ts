// Web Push: tells a person's phone that a lesson has finished. It only works for people who turned it on in Settings,
// and only when the VAPID keys are set. Nothing here ever stops a lesson from being built.

import * as webpush from "web-push";
import { db } from "./supabase";

export type StoredSubscription = { endpoint: string; p256dh: string; auth: string };
export type PushPayload = { title: string; body: string; url: string };
export type Sender = (sub: StoredSubscription, payload: PushPayload) => Promise<void>;

/** A subscription as the browser gives it, or null when it is not one. Only https endpoints are kept. */
export function parseSubscription(raw: unknown): StoredSubscription | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  const { endpoint } = r;
  const p256dh = r.keys?.p256dh;
  const auth = r.keys?.auth;
  if (typeof endpoint !== "string" || !endpoint.startsWith("https://") || endpoint.length > 1000) return null;
  if (typeof p256dh !== "string" || typeof auth !== "string" || !p256dh || !auth) return null;
  return { endpoint, p256dh, auth };
}

export function lessonPayload(sessionId: string, title: string, ok: boolean): PushPayload {
  const body = title.length > 100 ? `${title.slice(0, 97)}...` : title;
  return { title: ok ? "Lesson ready" : "Lesson failed", body, url: `/sessions/${sessionId}` };
}

export type Vapid = { publicKey: string; privateKey: string; subject: string };

export function vapidFromEnv(env: Record<string, string | undefined> = process.env): Vapid | null {
  const publicKey = env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = env.VAPID_PRIVATE_KEY?.trim();
  const subject = env.VAPID_SUBJECT?.trim() || "mailto:admin@example.com";
  return publicKey && privateKey ? { publicKey, privateKey, subject } : null;
}

/** Sends to every subscription. Returns the endpoints the push service says no longer exist, so they can be removed. */
export async function sendToAll(subs: StoredSubscription[], payload: PushPayload, send: Sender): Promise<string[]> {
  const gone: string[] = [];
  await Promise.all(
    subs.map(async (s) => {
      try {
        await send(s, payload);
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) gone.push(s.endpoint);
        else console.error("push failed", status ?? (err instanceof Error ? err.message : err));
      }
    }),
  );
  return gone;
}

export async function saveSubscription(userId: string, sub: StoredSubscription): Promise<void> {
  // The same phone can be re-subscribed by another person on it, so the endpoint moves to the latest user.
  const { error } = await db().from("push_subscriptions").upsert({ user_id: userId, ...sub }, { onConflict: "endpoint" });
  if (error) throw new Error(`Could not save the subscription: ${error.message}`);
}

export async function removeSubscription(userId: string, endpoint: string): Promise<void> {
  const { error } = await db().from("push_subscriptions").delete().eq("user_id", userId).eq("endpoint", endpoint);
  if (error) throw new Error(`Could not remove the subscription: ${error.message}`);
}

export async function hasSubscription(userId: string): Promise<boolean> {
  const { count, error } = await db().from("push_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if (error) return false;
  return (count ?? 0) > 0;
}

/** Sends one notification to every phone a person has turned notifications on for. Never throws. */
export async function notifyUser(userId: string, payload: PushPayload): Promise<void> {
  try {
    const vapid = vapidFromEnv();
    if (!vapid) return;
    const { data: rows } = await db().from("push_subscriptions").select("endpoint, p256dh, auth").eq("user_id", userId);
    if (!rows || rows.length === 0) return;
    const gone = await sendToAll(rows as StoredSubscription[], payload, async (s, p) => {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(p), {
        vapidDetails: { subject: vapid.subject, publicKey: vapid.publicKey, privateKey: vapid.privateKey },
        TTL: 60 * 60 * 24,
      });
    });
    if (gone.length > 0) await db().from("push_subscriptions").delete().in("endpoint", gone);
  } catch (err) {
    console.error("notifyUser skipped", err instanceof Error ? err.message : err);
  }
}

/** Tells the owner of a lesson that it finished. Never throws: a notification problem must not touch the lesson. */
export async function notifyLesson(sessionId: string, ok: boolean): Promise<void> {
  try {
    const { data: session } = await db().from("sessions").select("user_id, title").eq("id", sessionId).maybeSingle();
    if (!session) return;
    await notifyUser(session.user_id, lessonPayload(sessionId, String(session.title ?? ""), ok));
  } catch (err) {
    console.error("notifyLesson skipped", err instanceof Error ? err.message : err);
  }
}
