import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb, scopedTo, type Call } from "../test-support/fake-db";

// Every read and write of a person's lessons and deck must carry their user id. This is what stops one person
// opening another's lesson by guessing an id, so each function is checked against a recording fake of the database.

const ME = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const SESSION = "33333333-3333-4333-8333-333333333333";
const CARD = "44444444-4444-4444-8444-444444444444";

let fake: ReturnType<typeof createFakeDb>;
vi.mock("./supabase", () => ({ db: () => fake.db }));

const sessionRow = {
  id: SESSION,
  source_type: "text",
  source_url: null,
  title: "t",
  dialect: "neutral_latin_american",
  language: "es",
  status: "ready",
  error: null,
  created_at: "2026-11-20T00:00:00.000Z",
  user_id: ME,
};

const cardRow = {
  id: CARD,
  language: "es",
  payload: { lemma: "casa", english: "house", part_of_speech: "noun", example: "" },
  box: 0,
  reps: 0,
  lapses: 0,
  next_review_at: "2026-11-20T00:00:00.000Z",
  created_at: "2026-11-20T00:00:00.000Z",
  user_id: ME,
};

beforeEach(() => {
  fake = createFakeDb();
});

function readsAndWrites(table: string): Call[] {
  return fake.calls.filter((c) => c.table === table);
}

describe("lessons are limited to their owner", () => {
  it("creating a lesson stores the owner on it", async () => {
    fake = createFakeDb({ "sessions.insert": { data: { id: SESSION } }, "source_texts.insert": {} });
    const { createSession } = await import("./sessions");
    await createSession({ input: "Hola, esto es un texto de prueba para el dueño.", language: "es", userId: ME });
    const insert = fake.calls.find((c) => c.table === "sessions" && c.op === "insert")!;
    expect((insert.values as { user_id: string }).user_id).toBe(ME);
  });

  it("listing lessons filters by user", async () => {
    fake = createFakeDb({ "sessions.select": { data: [sessionRow] } });
    const { listSessions } = await import("./sessions");
    await listSessions(ME);
    expect(fake.calls.every((c) => scopedTo(c, ME))).toBe(true);
    expect(fake.calls).toHaveLength(1);
  });

  it("listing lessons for one language shows only that language, still limited to the user", async () => {
    fake = createFakeDb({ "sessions.select": { data: [sessionRow, { ...sessionRow, id: "5", language: "fa" }, { ...sessionRow, id: "6", language: "es" }] } });
    const { listSessions } = await import("./sessions");
    const fa = await listSessions(ME, 20, "fa");
    expect(fa.map((r) => r.language)).toEqual(["fa"]);
    expect(fake.calls.every((c) => scopedTo(c, ME))).toBe(true);
  });

  it("opening a lesson filters by id and user, and reads nothing else for someone else's lesson", async () => {
    fake = createFakeDb({ "sessions.select": { data: null } });
    const { getSession } = await import("./sessions");
    expect(await getSession(SESSION, OTHER)).toBeNull();
    const sessionsQuery = readsAndWrites("sessions")[0];
    expect(sessionsQuery.filters).toContainEqual(["id", SESSION]);
    expect(scopedTo(sessionsQuery, OTHER)).toBe(true);
    // Not found for this user: the lesson's text and enrichment are never read.
    expect(readsAndWrites("enrichments")).toHaveLength(0);
    expect(readsAndWrites("source_texts")).toHaveLength(0);
  });

  it("deleting a lesson filters by id and user", async () => {
    fake = createFakeDb({ "sessions.delete": { data: [] } });
    const { deleteSession } = await import("./sessions");
    await expect(deleteSession(SESSION, OTHER)).rejects.toMatchObject({ status: 404 });
    const del = fake.calls.find((c) => c.op === "delete")!;
    expect(del.filters).toContainEqual(["id", SESSION]);
    expect(scopedTo(del, OTHER)).toBe(true);
  });

  it("rebuilding checks the owner before reading the source text, and says not found for someone else's lesson", async () => {
    fake = createFakeDb({ "sessions.select": { data: null } });
    const { startRerun } = await import("./sessions");
    await expect(startRerun(SESSION, OTHER)).rejects.toMatchObject({ status: 404 });
    expect(scopedTo(readsAndWrites("sessions")[0], OTHER)).toBe(true);
    expect(readsAndWrites("source_texts")).toHaveLength(0);
  });

  it("rebuilding your own lesson reads its source text", async () => {
    fake = createFakeDb({ "sessions.select": { data: sessionRow }, "source_texts.select": { data: { text: "hola" } } });
    const { startRerun } = await import("./sessions");
    expect(await startRerun(SESSION, ME)).toMatchObject({ text: "hola", language: "es" });
  });
});

describe("the deck is limited to its owner", () => {
  it("saving a word stores the owner and conflicts per person, not across people", async () => {
    fake = createFakeDb({ "deck_items.upsert": { data: [{ id: CARD }] } });
    const { addToDeck } = await import("./deck");
    await addToDeck({ language: "es", payload: { lemma: "casa", english: "house", part_of_speech: "noun", example: "" }, sessionId: null, userId: ME });
    const call = fake.calls[0];
    expect((call.values as { user_id: string }).user_id).toBe(ME);
  });

  it("saving many words stores the owner on every row", async () => {
    fake = createFakeDb({ "deck_items.upsert": { data: [{ id: "a" }, { id: "b" }] } });
    const { addManyToDeck } = await import("./deck");
    const payload = (lemma: string) => ({ lemma, english: "x", part_of_speech: "noun", example: "" });
    await addManyToDeck({ language: "es", payloads: [payload("uno"), payload("dos")], sessionId: null, userId: ME });
    const rows = fake.calls[0].values as { user_id: string }[];
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.user_id === ME)).toBe(true);
  });

  it("listing, the quiz and the counts all filter by user", async () => {
    fake = createFakeDb({ "deck_items.select": { data: [cardRow], count: 1 } });
    const { deckSummary, listDeck, listDue } = await import("./deck");
    await listDeck(ME, "es");
    await listDue(ME, "es");
    await deckSummary(ME, "es");
    expect(fake.calls.length).toBeGreaterThanOrEqual(4);
    expect(fake.calls.every((c) => c.table === "deck_items" && scopedTo(c, ME))).toBe(true);
  });

  it("reviewing a card filters the read and the write by id and user", async () => {
    fake = createFakeDb({ "deck_items.select": { data: cardRow }, "deck_items.update": {} });
    const { reviewCard } = await import("./deck");
    await reviewCard(CARD, ME, "good");
    expect(fake.calls).toHaveLength(2);
    for (const call of fake.calls) {
      expect(call.filters).toContainEqual(["id", CARD]);
      expect(scopedTo(call, ME)).toBe(true);
    }
  });

  it("reviewing someone else's card is not found and changes nothing", async () => {
    fake = createFakeDb({ "deck_items.select": { data: null } });
    const { reviewCard } = await import("./deck");
    await expect(reviewCard(CARD, OTHER, "good")).rejects.toMatchObject({ status: 404 });
    expect(fake.calls.some((c) => c.op === "update")).toBe(false);
  });

  it("removing a card filters by id and user", async () => {
    fake = createFakeDb({ "deck_items.delete": { data: [] } });
    const { removeCard } = await import("./deck");
    await expect(removeCard(CARD, OTHER)).rejects.toMatchObject({ status: 404 });
    expect(fake.calls[0].filters).toContainEqual(["id", CARD]);
    expect(scopedTo(fake.calls[0], OTHER)).toBe(true);
  });
});
