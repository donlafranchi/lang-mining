import { describe, expect, it } from "vitest";
import { AGAIN_MINUTES, BOX_DAYS, isDue, schedule, type Rating } from "./srs";

const now = new Date("2026-11-18T12:00:00.000Z");
const minutes = (n: number) => new Date(now.getTime() + n * 60_000).toISOString();
const days = (n: number) => new Date(now.getTime() + n * 86_400_000).toISOString();
const card = (box: number, reps = 0, lapses = 0) => ({ box, reps, lapses });

describe("schedule", () => {
  it("uses the documented box intervals", () => {
    expect(BOX_DAYS).toEqual([1, 3, 7, 14, 30, 60]);
    expect(AGAIN_MINUTES).toBe(10);
  });

  it("again puts a card back in box 0, due in 10 minutes", () => {
    const next = schedule(card(3, 4), "again", now);
    expect(next.box).toBe(0);
    expect(next.next_review_at).toBe(minutes(10));
  });

  it("again counts a lapse only for a card that had been learned", () => {
    expect(schedule(card(3, 4, 0), "again", now).lapses).toBe(1);
    expect(schedule(card(0, 0, 0), "again", now).lapses).toBe(0);
    expect(schedule(card(0, 2, 1), "again", now).lapses).toBe(1);
  });

  it("good from box 0 goes to box 1, due in 1 day", () => {
    const next = schedule(card(0), "good", now);
    expect(next.box).toBe(1);
    expect(next.next_review_at).toBe(days(1));
  });

  it("good grows the interval box by box", () => {
    const seen = [0, 1, 2, 3, 4, 5].map((box) => schedule(card(box), "good", now));
    expect(seen.map((s) => s.box)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(seen.map((s) => s.next_review_at)).toEqual(BOX_DAYS.map((d) => days(d)));
  });

  it("good at the last box stays there, due in 60 days", () => {
    const next = schedule(card(6), "good", now);
    expect(next.box).toBe(6);
    expect(next.next_review_at).toBe(days(60));
  });

  it("easy moves up two boxes, capped at the last box", () => {
    expect(schedule(card(0), "easy", now).box).toBe(2);
    expect(schedule(card(0), "easy", now).next_review_at).toBe(days(3));
    expect(schedule(card(5), "easy", now).box).toBe(6);
    expect(schedule(card(6), "easy", now).box).toBe(6);
  });

  it("counts every review", () => {
    for (const rating of ["again", "good", "easy"] as Rating[]) {
      expect(schedule(card(2, 5), rating, now).reps).toBe(6);
    }
  });

  it("stamps the review time", () => {
    expect(schedule(card(0), "good", now).last_reviewed_at).toBe(now.toISOString());
  });

  it("does not change the card it was given", () => {
    const original = card(2, 3, 1);
    schedule(original, "good", now);
    expect(original).toEqual({ box: 2, reps: 3, lapses: 1 });
  });
});

describe("isDue", () => {
  it("is due at or after the review time", () => {
    expect(isDue(minutes(0), now)).toBe(true);
    expect(isDue(minutes(-1), now)).toBe(true);
    expect(isDue(minutes(1), now)).toBe(false);
  });
});
