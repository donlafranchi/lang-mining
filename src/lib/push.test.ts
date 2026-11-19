import { describe, expect, it, vi } from "vitest";
import { lessonPayload, parseSubscription, sendToAll, vapidFromEnv, type StoredSubscription } from "./push";

const sub = (n: number): StoredSubscription => ({ endpoint: `https://push.example/${n}`, p256dh: "p", auth: "a" });

describe("parseSubscription", () => {
  it("accepts a browser subscription and rejects junk", () => {
    expect(parseSubscription({ endpoint: "https://push.example/1", keys: { p256dh: "p", auth: "a" } })).toEqual({ endpoint: "https://push.example/1", p256dh: "p", auth: "a" });
    expect(parseSubscription({ endpoint: "http://insecure", keys: { p256dh: "p", auth: "a" } })).toBeNull();
    expect(parseSubscription({ endpoint: "https://x" })).toBeNull();
    expect(parseSubscription(null)).toBeNull();
  });
});

describe("lessonPayload", () => {
  it("says the lesson is ready and links to it", () => {
    expect(lessonPayload("abc", "Mi día", true)).toEqual({ title: "Lesson ready", body: "Mi día", url: "/sessions/abc" });
  });
  it("says when a lesson could not be built, and trims long titles", () => {
    expect(lessonPayload("abc", "x".repeat(300), false).title).toBe("Lesson failed");
    expect(lessonPayload("abc", "x".repeat(300), true).body.length).toBeLessThanOrEqual(100);
  });
});

describe("vapidFromEnv", () => {
  it("is off unless the keys are set", () => {
    expect(vapidFromEnv({})).toBeNull();
    expect(vapidFromEnv({ VAPID_PUBLIC_KEY: "a", VAPID_PRIVATE_KEY: "b", VAPID_SUBJECT: "mailto:x@y.z" })).toEqual({ publicKey: "a", privateKey: "b", subject: "mailto:x@y.z" });
  });
});

describe("sendToAll", () => {
  it("sends to every subscription and reports the ones the push service says are gone", async () => {
    const send = vi.fn(async (s: StoredSubscription) => {
      if (s.endpoint.endsWith("/2")) throw Object.assign(new Error("gone"), { statusCode: 410 });
      if (s.endpoint.endsWith("/3")) throw Object.assign(new Error("boom"), { statusCode: 500 });
    });
    const gone = await sendToAll([sub(1), sub(2), sub(3)], { title: "t", body: "b", url: "/" }, send);
    expect(send).toHaveBeenCalledTimes(3);
    expect(gone).toEqual(["https://push.example/2"]);
  });
});
