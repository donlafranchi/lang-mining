import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb, scopedTo } from "../test-support/fake-db";

let fake: ReturnType<typeof createFakeDb>;
vi.mock("./supabase", () => ({ db: () => fake.db }));

const ME = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const SESSION = "33333333-3333-4333-8333-333333333333";

beforeEach(() => {
  fake = createFakeDb();
});

describe("lineKey and siteOf", () => {
  it("treats the same furniture line with different numbers as one line", async () => {
    const { lineKey } = await import("./blocklist");
    expect(lineKey("Fecha de publicación 4 horas")).toBe(lineKey("  fecha de publicación 12 HORAS "));
    expect(lineKey("Descubre más")).not.toBe(lineKey("Descubre menos"));
  });
  it("names the site by its host without www", async () => {
    const { siteOf } = await import("./blocklist");
    expect(siteOf("https://www.Example.com/a/b?c=1")).toBe("example.com");
    expect(siteOf(null)).toBeNull();
    expect(siteOf("not a url")).toBeNull();
  });
});

describe("filterBlocked", () => {
  it("drops the blocked lines from an article's text and keeps the rest, never returning nothing", async () => {
    const { filterBlocked, lineKey } = await import("./blocklist");
    const keys = new Set([lineKey("Título del video"), lineKey("Fecha de publicación 9 horas")]);
    const text = ["Un párrafo de verdad que sigue en la nota.", "Título del video", "Fecha de publicación 4 horas", "Otro párrafo real de la nota."].join("\n\n");
    expect(filterBlocked(text, keys)).toBe("Un párrafo de verdad que sigue en la nota.\n\nOtro párrafo real de la nota.");
    expect(filterBlocked("Título del video", keys)).toBe("Título del video");
  });
});

describe("removeParagraph", () => {
  const lesson = { gist: "g", paragraphs: [{ spanish: "Un párrafo de verdad que sigue.", vocab: [] }, { spanish: "Título del video", vocab: [] }] };

  it("removes the paragraph from the owner's lesson and remembers its line for that site", async () => {
    fake = createFakeDb({
      "sessions.select": { data: { id: SESSION, source_url: "https://www.example.com/nota", language: "es" } },
      "enrichments.select": { data: { json: lesson } },
      "source_texts.select": { data: { text: "Un párrafo de verdad que sigue.\n\nTítulo del video" } },
    });
    const { removeParagraph } = await import("./blocklist");
    const out = await removeParagraph(SESSION, ME, 1);
    expect(out).toEqual({ remembered: true, site: "example.com" });
    const read = fake.calls.find((c) => c.table === "sessions" && c.op === "select")!;
    expect(scopedTo(read, ME)).toBe(true);
    const saved = fake.calls.find((c) => c.table === "enrichments" && c.op === "update")!;
    expect((saved.values as { json: { paragraphs: unknown[] } }).json.paragraphs).toHaveLength(1);
    const text = fake.calls.find((c) => c.table === "source_texts" && c.op === "update")!;
    expect((text.values as { text: string }).text).toBe("Un párrafo de verdad que sigue.");
    const block = fake.calls.find((c) => c.table === "site_blocklist" && c.op === "upsert")!;
    expect(block.values).toMatchObject({ site: "example.com" });
  });

  it("does nothing, and reads nothing else, for someone else's lesson", async () => {
    fake = createFakeDb({ "sessions.select": { data: null } });
    const { removeParagraph } = await import("./blocklist");
    await expect(removeParagraph(SESSION, OTHER, 0)).rejects.toMatchObject({ status: 404 });
    expect(fake.calls.filter((c) => c.table === "enrichments" || c.table === "site_blocklist")).toHaveLength(0);
  });

  it("removes a long paragraph from this lesson only, without teaching the site", async () => {
    const long = { gist: "g", paragraphs: [{ spanish: "x".repeat(400), vocab: [] }, { spanish: "Otro.", vocab: [] }] };
    fake = createFakeDb({
      "sessions.select": { data: { id: SESSION, source_url: "https://example.com/n", language: "es" } },
      "enrichments.select": { data: { json: long } },
      "source_texts.select": { data: { text: `${"x".repeat(400)}\n\nOtro.` } },
    });
    const { removeParagraph } = await import("./blocklist");
    expect((await removeParagraph(SESSION, ME, 0)).remembered).toBe(false);
    expect(fake.calls.some((c) => c.table === "site_blocklist")).toBe(false);
  });

  it("refuses a paragraph that is not there", async () => {
    fake = createFakeDb({
      "sessions.select": { data: { id: SESSION, source_url: null, language: "es" } },
      "enrichments.select": { data: { json: lesson } },
    });
    const { removeParagraph } = await import("./blocklist");
    await expect(removeParagraph(SESSION, ME, 9)).rejects.toMatchObject({ status: 400 });
  });
});
