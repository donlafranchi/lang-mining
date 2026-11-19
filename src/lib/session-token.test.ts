import { describe, expect, it } from "vitest";
import { signSession, verifySession } from "./session-token";

const SECRET = "a".repeat(40);
const USER = "3f2b8c1e-9a4d-4e7b-8c5a-1d2e3f4a5b6c";
const now = new Date("2026-11-20T12:00:00.000Z");

describe("session token", () => {
  it("round-trips the user id and version", async () => {
    const token = await signSession({ userId: USER, version: 3 }, SECRET, now);
    const payload = await verifySession(token, SECRET, now);
    expect(payload).toMatchObject({ userId: USER, version: 3 });
  });

  it("looks like payload.signature and holds no readable secret", async () => {
    const token = await signSession({ userId: USER, version: 1 }, SECRET, now);
    expect(token.split(".")).toHaveLength(2);
    expect(token).not.toContain(SECRET);
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await signSession({ userId: USER, version: 1 }, SECRET, now);
    expect(await verifySession(token, "b".repeat(40), now)).toBeNull();
  });

  it("rejects a token whose payload was changed", async () => {
    const token = await signSession({ userId: USER, version: 1 }, SECRET, now);
    const [, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ u: "00000000-0000-4000-8000-000000000000", v: 1, exp: now.getTime() + 1e9 })).toString("base64url");
    expect(await verifySession(`${forged}.${sig}`, SECRET, now)).toBeNull();
  });

  it("rejects a token whose signature was changed", async () => {
    const token = await signSession({ userId: USER, version: 1 }, SECRET, now);
    const flipped = token.slice(0, -2) + (token.endsWith("AA") ? "BB" : "AA");
    expect(await verifySession(flipped, SECRET, now)).toBeNull();
  });

  it("rejects an expired token and accepts one just before it expires", async () => {
    const token = await signSession({ userId: USER, version: 1 }, SECRET, now, 1);
    const day = 24 * 60 * 60 * 1000;
    expect(await verifySession(token, SECRET, new Date(now.getTime() + day - 1000))).not.toBeNull();
    expect(await verifySession(token, SECRET, new Date(now.getTime() + day + 1000))).toBeNull();
  });

  it.each([undefined, "", "abc", "a.b.c", ".", "x.", ".y", "not base64!.sig"])("rejects %j", async (value) => {
    expect(await verifySession(value, SECRET, now)).toBeNull();
  });

  it("refuses to sign or verify with an empty secret", async () => {
    await expect(signSession({ userId: USER, version: 1 }, "", now)).rejects.toThrow();
    expect(await verifySession("a.b", "", now)).toBeNull();
  });
});
