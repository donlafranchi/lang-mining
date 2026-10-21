# Spec: UI (mobile-first PWA)

Owner of UI/UX decisions: Don. Items marked ASSUMPTION are not decided yet.

## Screen 1: Lesson browse feed (home)
- Lessons are grouped by category and browsed by vertical scroll (TikTok-style feed, one lesson card per snap).
- Each card shows a summary so learning happens while scrolling: a one-line gist, the top-payoff words for that lesson (the "learn" lemmas from the ranking spike), and the category.
- Tapping a card opens the lesson.
- ASSUMPTION: what a "category" means (topic such as work/news/travel, difficulty, or source type) is undecided. Start with topic; revisit.

## Screen 2: Lesson view
- Opens full screen, vertically scrollable.
- Exit control returns to the same position in the browse feed.
- Panels inside a lesson are reached by horizontal swipe: text (with skip marking), vocab, verbs and parts of speech per word, quiz.
- ASSUMPTION: horizontal panels stay inside the opened lesson. Vertical scroll inside a panel no longer conflicts with swipe-up, because swipe-up for next lesson is gone; the feed handles lesson switching.
- Page dots show which panel is active.
- iOS note: keep a small inner margin on the first panel so left-edge swipe does not trigger browser back.

## Build order
1. Browse feed with cards (gist, top words, category) and tap-to-open.
2. Lesson view with text and vocab panels only.
3. Verbs/parts-of-speech panel and quiz after the ranking spike works.

## Out of scope for now
- Coverage meter UI, skeleton mode, personalization of the feed order.
