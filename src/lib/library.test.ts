import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb } from "../test-support/fake-db";

let fake: ReturnType<typeof createFakeDb>;
vi.mock("./supabase", () => ({ db: () => fake.db }));

const NEW_SESSION = "55555555-5555-4555-8555-555555555555";
const DONOR = "66666666-6666-4666-8666-666666666666";

beforeEach(() => {
  fake = createFakeDb();
});

describe("normalizeUrl", () => {
  it("treats the same article reached through tracking links, fragments and a trailing slash as one", async () => {
    const { normalizeUrl } = await import("./library");
    const a = normalizeUrl("https://WWW.Example.com/noticias/hoy/?utm_source=x&fbclid=1#comentarios");
    expect(a).toBe("https://www.example.com/noticias/hoy");
    expect(normalizeUrl("https://www.example.com/noticias/hoy")).toBe(a);
    expect(normalizeUrl("https://example.com/a?id=5&utm_medium=y")).toBe("https://example.com/a?id=5");
  });
});

describe("libraryKey", () => {
  it("differs by language and help level, so a lesson is only reused when it would be built the same way", async () => {
    const { libraryKey } = await import("./library");
    const base = libraryKey("https://example.com/a", "es", "light");
    expect(libraryKey("https://example.com/a?utm_source=z", "es", "light")).toBe(base);
    expect(libraryKey("https://example.com/a", "es", "full")).not.toBe(base);
    expect(libraryKey("https://example.com/a", "fa", "light")).not.toBe(base);
  });
});

describe("reuseFromLibrary", () => {
  const json = { gist: "g", paragraphs: [], title: "Un título" };

  it("copies a finished lesson onto the new session, and reads the shared lesson only by its key", async () => {
    fake = createFakeDb({
      "sessions.select": { data: { id: DONOR } },
      "enrichments.select": { data: { json, model: "m" } },
    });
    const { reuseFromLibrary } = await import("./library");
    const out = await reuseFromLibrary(NEW_SESSION, "key-1");
    expect(out).toEqual({ title: "Un título" });
    const lookup = fake.calls.find((c) => c.table === "sessions" && c.op === "select")!;
    expect(lookup.filters).toContainEqual(["library_key", "key-1"]);
    const copy = fake.calls.find((c) => c.table === "enrichments" && c.op === "upsert")!;
    expect(copy.values).toMatchObject({ session_id: NEW_SESSION, json, model: "m" });
    const done = fake.calls.find((c) => c.table === "sessions" && c.op === "update")!;
    expect(done.filters).toContainEqual(["id", NEW_SESSION]);
    expect(done.values).toMatchObject({ status: "ready", library_key: "key-1" });
    // Nothing about the other person is read or copied.
    expect(JSON.stringify(fake.calls.map((c) => c.values))).not.toContain(DONOR);
  });

  it("returns null when nobody has built this article yet", async () => {
    fake = createFakeDb({ "sessions.select": { data: null } });
    const { reuseFromLibrary } = await import("./library");
    expect(await reuseFromLibrary(NEW_SESSION, "key-1")).toBeNull();
  });

  it("returns null, never an error, when the library cannot be read (for example the column is not there yet)", async () => {
    fake = createFakeDb({ "sessions.select": { error: { message: "column sessions.library_key does not exist" } } });
    const { reuseFromLibrary } = await import("./library");
    expect(await reuseFromLibrary(NEW_SESSION, "key-1")).toBeNull();
  });
});

describe("shareLesson", () => {
  it("marks a finished lesson as shareable, and ignores a failure", async () => {
    fake = createFakeDb({ "sessions.update": { error: { message: "no such column" } } });
    const { shareLesson } = await import("./library");
    await expect(shareLesson(NEW_SESSION, "key-1")).resolves.toBeUndefined();
    expect(fake.calls[0].values).toEqual({ library_key: "key-1" });
  });
});
