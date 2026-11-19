import { describe, expect, it } from "vitest";
import { fakeUserRepo, userRecord } from "../test-support/fake-user-repo";
import { addUser, removeUser, resetPasscode } from "./admin";
import { verifyPasscode } from "./passwords";

const OWNER = userRecord({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", name: "Don", is_admin: true });
const FRIEND = userRecord({ id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", name: "Maria" });

const actorOf = (u: typeof OWNER) => ({ id: u.id, isAdmin: u.is_admin });

describe("addUser", () => {
  it("lets an admin add a person, as a non-admin, with a hashed passcode", async () => {
    const { repo, users } = fakeUserRepo([OWNER]);
    const result = await addUser(repo, actorOf(OWNER), { name: "Juan", passcode: "juan-secret" });
    expect(result.ok).toBe(true);
    const juan = [...users.values()].find((u) => u.name === "Juan")!;
    expect(juan.is_admin).toBe(false);
    expect(juan.passcode_hash).not.toContain("juan-secret");
    expect(await verifyPasscode("juan-secret", juan.passcode_hash)).toBe(true);
  });

  it("refuses anyone who is not an admin", async () => {
    const { repo, users } = fakeUserRepo([OWNER, FRIEND]);
    const result = await addUser(repo, actorOf(FRIEND), { name: "Juan", passcode: "juan-secret" });
    expect(result).toMatchObject({ ok: false, status: 403 });
    expect(users.size).toBe(2);
  });

  it("refuses a name already in use, however it is written", async () => {
    const { repo, users } = fakeUserRepo([OWNER, FRIEND]);
    const result = await addUser(repo, actorOf(OWNER), { name: " MARIA ", passcode: "another-secret" });
    expect(result).toMatchObject({ ok: false, status: 409 });
    expect(users.size).toBe(2);
  });

  it("refuses a short passcode and a bad name", async () => {
    const { repo, users } = fakeUserRepo([OWNER]);
    expect(await addUser(repo, actorOf(OWNER), { name: "Juan", passcode: "123" })).toMatchObject({ ok: false, status: 400 });
    expect(await addUser(repo, actorOf(OWNER), { name: "", passcode: "juan-secret" })).toMatchObject({ ok: false, status: 400 });
    expect(users.size).toBe(1);
  });
});

describe("removeUser", () => {
  it("lets an admin remove someone else", async () => {
    const { repo, users } = fakeUserRepo([OWNER, FRIEND]);
    expect((await removeUser(repo, actorOf(OWNER), FRIEND.id)).ok).toBe(true);
    expect(users.has(FRIEND.id)).toBe(false);
  });

  it("refuses non-admins", async () => {
    const { repo, users } = fakeUserRepo([OWNER, FRIEND]);
    expect(await removeUser(repo, actorOf(FRIEND), OWNER.id)).toMatchObject({ ok: false, status: 403 });
    expect(users.size).toBe(2);
  });

  it("refuses removing yourself", async () => {
    const { repo, users } = fakeUserRepo([OWNER, FRIEND]);
    expect(await removeUser(repo, actorOf(OWNER), OWNER.id)).toMatchObject({ ok: false, status: 400 });
    expect(users.size).toBe(2);
  });

  it("refuses removing the last admin", async () => {
    const second = userRecord({ id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", name: "Second", is_admin: true });
    const { repo, users } = fakeUserRepo([OWNER, second]);
    // one admin removes the other, leaving one admin: allowed. Then the remaining admin cannot be removed by anyone.
    expect((await removeUser(repo, actorOf(OWNER), second.id)).ok).toBe(true);
    expect(users.size).toBe(1);
    expect(await removeUser(repo, actorOf(OWNER), OWNER.id)).toMatchObject({ ok: false, status: 400 });
  });

  it("says not found for someone who does not exist", async () => {
    const { repo } = fakeUserRepo([OWNER]);
    expect(await removeUser(repo, actorOf(OWNER), "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee")).toMatchObject({ ok: false, status: 404 });
  });
});

describe("resetPasscode", () => {
  it("sets a new passcode, which signs the person out everywhere", async () => {
    const { repo, users, calls } = fakeUserRepo([OWNER, FRIEND]);
    const before = users.get(FRIEND.id)!.token_version;
    expect((await resetPasscode(repo, actorOf(OWNER), FRIEND.id, "brand-new-secret")).ok).toBe(true);
    const after = users.get(FRIEND.id)!;
    expect(after.token_version).toBe(before + 1);
    expect(await verifyPasscode("brand-new-secret", after.passcode_hash)).toBe(true);
    expect(calls).toContain(`setPasscode:${FRIEND.id}`);
  });

  it("refuses non-admins, short passcodes and unknown people", async () => {
    const { repo } = fakeUserRepo([OWNER, FRIEND]);
    expect(await resetPasscode(repo, actorOf(FRIEND), OWNER.id, "brand-new-secret")).toMatchObject({ ok: false, status: 403 });
    expect(await resetPasscode(repo, actorOf(OWNER), FRIEND.id, "123")).toMatchObject({ ok: false, status: 400 });
    expect(await resetPasscode(repo, actorOf(OWNER), "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", "brand-new-secret")).toMatchObject({
      ok: false,
      status: 404,
    });
  });
});
