import { describe, expect, it } from "vitest";
import { fakeUserRepo, userRecord } from "../test-support/fake-user-repo";
import { signUp, signupErrorText } from "./signup";

const OWNER = userRecord({ id: "o", name: "Don", name_key: "don", is_admin: true });
const ctx = { signupCode: "open-sesame" };
const good = { name: "Maria", passcode: "secret123", code: "open-sesame" };

describe("signUp", () => {
  it("creates a normal (non-owner) user with the right code", async () => {
    const { repo, users } = fakeUserRepo([OWNER]);
    const r = await signUp(repo, good, ctx);
    expect(r.ok).toBe(true);
    expect(users).toHaveLength(2);
    expect([...users.values()].find((u) => u.name === "Maria")!.is_admin).toBe(false);
  });

  it("is open with no code needed when no invite code is set", async () => {
    const { repo, users } = fakeUserRepo([OWNER]);
    const r = await signUp(repo, { ...good, code: "" }, { signupCode: undefined });
    expect(r.ok).toBe(true);
    expect(users.size).toBe(2);
  });

  it("refuses a wrong code and creates nothing", async () => {
    const { repo, users } = fakeUserRepo([OWNER]);
    expect(await signUp(repo, { ...good, code: "nope" }, ctx)).toMatchObject({ ok: false, code: "bad_code", status: 403 });
    expect(users).toHaveLength(1);
  });

  it("refuses a taken name, a short password, a bad name and blanks", async () => {
    const { repo } = fakeUserRepo([OWNER]);
    expect(await signUp(repo, { ...good, name: "don" }, ctx)).toMatchObject({ code: "taken" });
    expect(await signUp(repo, { ...good, passcode: "abc" }, ctx)).toMatchObject({ code: "bad_password" });
    expect(await signUp(repo, { ...good, name: "x".repeat(41) }, ctx)).toMatchObject({ code: "bad_name" });
    expect(await signUp(repo, { ...good, name: " " }, ctx)).toMatchObject({ code: "missing" });
  });

  it("never makes the first account (the owner comes from signing in with APP_PASSCODE)", async () => {
    const { repo, users } = fakeUserRepo([]);
    expect(await signUp(repo, good, ctx)).toMatchObject({ ok: false, code: "no_owner" });
    expect(users).toHaveLength(0);
  });

  it("only shows fixed text for an error code", () => {
    expect(signupErrorText("taken")).toMatch(/already in use/);
    expect(signupErrorText("<script>")).toBeNull();
  });
});
