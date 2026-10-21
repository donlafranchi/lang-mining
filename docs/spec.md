# lang-mining: Spec

## Goal
Share a link, text, or clip from an iPhone. Get a mobile-first Spanish study session mined from it: transcript view, vocabulary, idioms, verb conjugations, dialect notes, quiz. Dialect-aware (Puerto Rican first, others selectable).

## Scope
- Personal DIY tool, single user, private repo
- Not for resale. No App Store, no licensing program, no multi-tenant accounts
- Phone side is a PWA plus an iOS Shortcut for the share sheet

## Architecture
- Frontend: Next.js PWA on Vercel
- Data: Supabase (Postgres, Storage, Realtime for job status)
- Enrichment: Claude API, one structured-JSON call per session
- Transcription worker: swappable, same contract for every engine
  - Phase 1: cloud speech-to-text (OpenAI transcribe or Whisper, ElevenLabs Scribe, or Gemini; compare on a sample clip first)
  - Phase 2: local whisper.cpp or MLX Whisper on the home Mac (new MacBook, expected mid to late November 2026)
- Media fetch worker: runs on the home Mac only (residential IP). Uses captions first, downloads audio only when captions are missing
- Audio prep: ffmpeg to mono compact audio

## Inputs
- Text paste
- URL: article text extraction, or video link (captions first, then audio transcription)
- File upload: video or audio from Photos, resumable direct upload to Supabase Storage

## Job pipeline
1. Create session row (status queued) with source type and dialect
2. Text or article URL: extract text, go to step 5
3. Video link or media file: Mac worker claims job (status fetching, then transcribing)
4. Worker returns transcript with segment timestamps
5. Claude enrichment (status enriching), JSON validated against schema
6. Status ready. Source text scheduled for deletion at the retention date
7. If a media job is queued and the Mac worker heartbeat is stale, show "waiting for home machine"

## Dialect handling
- Dialect field on every session, default per user, override per session
- Claude tags vocab and idioms by region and register, with a short note on how it differs elsewhere
- Conjugation tables respect tu, voseo, vosotros, ustedes
- Detect-and-confirm: Claude infers the likely dialect, user can change it and re-run enrichment without re-transcribing
- Puerto Rican features (dropped final s, l/r merging, Spanglish) are described, not treated as errors

## Enrichment JSON schema
- summary: 2 to 3 sentence gist in English
- segments[]: spanish, english, start_sec, end_sec
- vocab[]: lemma, surface_form, part_of_speech, english, example_fragment, level, dialect_tags[]
- idioms[]: phrase, literal_meaning, actual_meaning, region_tags[], register, similar_in_other_dialects
- verbs[]: infinitive, form_in_source, tense, mood, person, conjugation_table, irregular, dialect_note
- grammar_notes[]
- quiz[]: question, answer, type (vocab, idiom, verb, listening)

## Screens
- Home: paste or upload box, recent sessions, dialect picker
- Session tabs: Read, Vocab, Idioms, Verbs, Quiz
- Tap a word: bottom sheet with lemma, meaning, conjugation, dialect tags
- Save to deck: vocab and idioms go to a persistent review list

## Tables
- sessions: id, source_type, source_url, dialect, status, retention_until, created_at
- source_texts: session_id, text, delete_after (transient)
- enrichments: session_id, dialect, json, model, created_at
- deck_items: id, kind, payload, dialect_tags, next_review_at
- worker_heartbeat: worker_id, last_seen

## Phasing
1. Text and article URL, enrichment, session UI, dialect picker (no audio)
2. Video link via captions, then media upload, cloud transcription, timestamp replay
3. Mac worker with local Whisper
4. Quiz and spaced-repetition deck
5. iOS Shortcut for share-sheet submission

## Known risks
- YouTube and TikTok terms restrict downloading and downloader tools break often: keep fetch on the Mac, prefer captions
- Transcription accuracy drops on fast or strong Caribbean speech: allow inline transcript correction and re-enrich
- Long videos: upload time and transcription cost scale with length, cap or warn
- Laptop worker sleeps or travels: queue jobs, show status, never fail silently
- Dialect and idiom labels from Claude can be wrong on slang: add a fix button per idiom and store corrections
