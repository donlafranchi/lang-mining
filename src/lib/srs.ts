// Spaced repetition in boxes. Box 0 is "learning": a new or missed card comes back in minutes.
// Boxes 1 to 6 are day intervals. Simple on purpose, good enough for one person and a few hundred words.

export type Rating = "again" | "good" | "easy";

export const BOX_DAYS = [1, 3, 7, 14, 30, 60] as const;
export const LAST_BOX = BOX_DAYS.length;
export const AGAIN_MINUTES = 10;

export type CardState = { box: number; reps: number; lapses: number };
export type Scheduled = CardState & { next_review_at: string; last_reviewed_at: string };

export function schedule(card: CardState, rating: Rating, now: Date): Scheduled {
  const reps = card.reps + 1;
  const reviewed = now.toISOString();

  if (rating === "again") {
    return {
      box: 0,
      reps,
      // Missing a card you had learned is a lapse. Missing one still in learning is not.
      lapses: card.box > 0 ? card.lapses + 1 : card.lapses,
      next_review_at: new Date(now.getTime() + AGAIN_MINUTES * 60_000).toISOString(),
      last_reviewed_at: reviewed,
    };
  }

  const box = Math.min(LAST_BOX, card.box + (rating === "easy" ? 2 : 1));
  return {
    box,
    reps,
    lapses: card.lapses,
    next_review_at: new Date(now.getTime() + BOX_DAYS[box - 1] * 86_400_000).toISOString(),
    last_reviewed_at: reviewed,
  };
}

export function isDue(nextReviewAt: string, now: Date): boolean {
  return new Date(nextReviewAt).getTime() <= now.getTime();
}
