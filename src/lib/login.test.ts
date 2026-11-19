import { describe, expect, it } from "vitest";
import { fakeUserRepo, userRecord } from "../test-support/fake-user-repo";
import { attemptLogin } from "./login";
import { hashPasscode } from "./passwords";

const OWNER_PASSCODE = "owner-bootstrap-passcode";
const now = new Date("2026-11-20T12:00:00.000Z");
const ctx = { bootstrapPasscode: OWNER_PASSCODE, now };

async function withUser(name: string, passcode: string, extra: Partial<Parameters<typeof userRecord>[0]> = {}) {
  return userRecord({ id: "11111111-1111-4111-8111-111111111111", name, passcode_hash: await hashPasscode(passcode), ...extra });
}

describe("first sign-in (no users yet)", () => {
  it("creates the owner with the existing passcode, adopts old data, and signs in", async () => {
    const { repo, users, calls } = fakeUserRepo();
    const result = await attemptLogin(repo, { name: "Don", passcode: OWNER_PASSCODE }, ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.created).toBe(true);
    expect(result.user.is_admin).toBe(true);
    expect(result.user.name).toBe("Don");
    expect(users.size).toBe(1);
    expect(calls).toContain(`adopt:${result.user.id}`);
    expect(result.user.passcode_hash).not.toContain(OWNER_PASSCODE);
  });

  it("creates nothing with a wrong passcode", async () => {
    const { repo, users } = fakeUserRepo();
    const result = await attemptLogin(repo, { name: "Don", passcode: "guess-guess" }, ctx);
    expect(result).toMatchObject({ ok: false, status: 401 });
    expect(users.size).toBe(0);
  });

  it("says so when no owner passcode is set", async () => {
    const { repo, users } = fakeUserRepo();
    const result = await attemptLogin(repo, { name: "Don", passcode: "anything" }, { ...ctx, bootstrapPasscode: undefined });
    expect(result).toMatchObject({ ok: false, status: 503 });
    expect(users.size).toBe(0);
  });

  it("refuses an invalid name without creating anything", async () => {
    const { repo, users } = fakeUserRepo();
    const result = await attemptLogin(repo, { name: "a\nb", passcode: OWNER_PASSCODE }, ctx);
    expect(result).toMatchObject({ ok: false, status: 400 });
    expect(users.size).toBe(0);
  });

  it("stops creating owners once someone exists", async () => {
    const { repo, users } = fakeUserRepo([await withUser("Don", "dons-own-passcode", { is_admin: true })]);
    const result = await attemptLogin(repo, { name: "Intruder", passcode: OWNER_PASSCODE }, ctx);
    expect(result).toMatchObject({ ok: false, status: 401 });
    expect(users.size).toBe(1);
  });
});

describe("signing in", () => {
  it("accepts the right name and passcode, ignoring name case and spacing", async () => {
    const { repo } = fakeUserRepo([await withUser("Maria Lopez", "maria-secret")]);
    const result = await attemptLogin(repo, { name: "  maria   LOPEZ ", passcode: "maria-secret" }, ctx);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.created).toBe(false);
  });

  it("gives the same answer for an unknown name and a wrong passcode", async () => {
    const { repo } = fakeUserRepo([await withUser("Maria", "maria-secret")]);
    const unknown = await attemptLogin(repo, { name: "Nobody", passcode: "maria-secret" }, ctx);
    const wrong = await attemptLogin(repo, { name: "Maria", passcode: "wrong-secret" }, ctx);
    expect(unknown).toEqual(wrong);
    expect(unknown).toMatchObject({ ok: false, status: 401 });
  });

  it("refuses an empty name or passcode", async () => {
    const { repo } = fakeUserRepo([await withUser("Maria", "maria-secret")]);
    expect(await attemptLogin(repo, { name: "", passcode: "x" }, ctx)).toMatchObject({ ok: false, status: 400 });
    expect(await attemptLogin(repo, { name: "Maria", passcode: "" }, ctx)).toMatchObject({ ok: false, status: 400 });
  });
});

describe("lockout", () => {
  it("locks the account on the fifth wrong passcode and refuses even the right one while locked", async () => {
    const { repo, users } = fakeUserRepo([await withUser("Maria", "maria-secret")]);
    for (let i = 0; i < 4; i++) {
      expect(await attemptLogin(repo, { name: "Maria", passcode: "wrong-secret" }, ctx)).toMatchObject({ ok: false, status: 401 });
    }
    const fifth = await attemptLogin(repo, { name: "Maria", passcode: "wrong-secret" }, ctx);
    expect(fifth).toMatchObject({ ok: false, status: 429 });

    const whileLocked = await attemptLogin(repo, { name: "Maria", passcode: "maria-secret" }, ctx);
    expect(whileLocked).toMatchObject({ ok: false, status: 429 });
    if (!whileLocked.ok) expect(whileLocked.message).toMatch(/15 minutes/);
    expect([...users.values()][0].locked_until).not.toBeNull();
  });

  it("lets the right passcode in again once the lock has passed", async () => {
    const locked = await withUser("Maria", "maria-secret", { locked_until: new Date(now.getTime() - 1000).toISOString() });
    const { repo } = fakeUserRepo([locked]);
    expect((await attemptLogin(repo, { name: "Maria", passcode: "maria-secret" }, ctx)).ok).toBe(true);
  });

  it("clears the failure count after a good sign-in", async () => {
    const { repo, users } = fakeUserRepo([await withUser("Maria", "maria-secret", { failed_attempts: 3 })]);
    expect((await attemptLogin(repo, { name: "Maria", passcode: "maria-secret" }, ctx)).ok).toBe(true);
    expect([...users.values()][0].failed_attempts).toBe(0);
  });

  it("does not lock one person out because of another person's wrong guesses", async () => {
    const { repo } = fakeUserRepo([
      await withUser("Maria", "maria-secret"),
      userRecord({ id: "22222222-2222-4222-8222-222222222222", name: "Juan", passcode_hash: await hashPasscode("juan-secret") }),
    ]);
    for (let i = 0; i < 6; i++) await attemptLogin(repo, { name: "Maria", passcode: "nope-nope" }, ctx);
    expect((await attemptLogin(repo, { name: "Juan", passcode: "juan-secret" }, ctx)).ok).toBe(true);
  });
});
