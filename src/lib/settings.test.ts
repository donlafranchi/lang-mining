import { describe, expect, it } from "vitest";
import { fakeUserRepo, userRecord } from "../test-support/fake-user-repo";
import { resolveHelp } from "./help";
import { saveHelp } from "./settings";

const me = userRecord({ id: "00000000-0000-4000-8000-000000000001", name: "Don" });
const other = userRecord({ id: "00000000-0000-4000-8000-000000000002", name: "Ana" });

describe("saveHelp", () => {
  it("saves a level for one language and leaves the other alone", async () => {
    const { repo, users } = fakeUserRepo([me, other]);
    expect(await saveHelp(repo, me.id, { language: "fa", help: "full" })).toEqual({ ok: true });
    expect(users.get(me.id)?.help_fa).toBe("full");
    expect(users.get(me.id)?.help_es).toBeUndefined();
  });

  it("never changes anyone else", async () => {
    const { repo, users } = fakeUserRepo([me, other]);
    await saveHelp(repo, me.id, { language: "es", help: "medium" });
    expect(users.get(other.id)?.help_es).toBeUndefined();
  });

  it("rejects an unknown language or level and saves nothing", async () => {
    const { repo, calls } = fakeUserRepo([me]);
    expect((await saveHelp(repo, me.id, { language: "fr", help: "full" })).ok).toBe(false);
    expect((await saveHelp(repo, me.id, { language: "es", help: "lots" })).ok).toBe(false);
    expect(calls).toEqual([]);
  });

  it("falls back to each language's default when nothing is saved", () => {
    expect(resolveHelp(null, "es")).toBe("light");
    expect(resolveHelp(undefined, "fa")).toBe("full");
  });
});
