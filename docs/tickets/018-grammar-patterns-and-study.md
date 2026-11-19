# 018 Grammar patterns ("new to you") and the Study section

- A hand-written catalog of Spanish multi-word patterns (src/lib/patterns.ts): present perfect (ha dado), past perfect, perfect subjunctive, estar + gerund, seguir + gerund, ir a, acabar de, volver a, tener que, ser passive. Each has a recipe, an explanation and 3-5 examples with different verbs.
- The lesson prompt asks the model only to tag which pattern ids appear in each paragraph, with the exact quote. Our code supplies the teaching. Unknown ids are ignored; old lessons read as having no patterns.
- A pattern the person has not met yet opens as a "New to you" card at the top of the lesson with a Got it button (stored per person in user_patterns_seen, migration 0007). After that it is a small tag on the paragraph and a card under "Patterns you know".
- New Study page on the home screen: Quiz, Deck, Grammar patterns. Quiz is the home of the handwriting work to come.
- Spanish only for now. Existing lessons need a rerun to get pattern tags.
