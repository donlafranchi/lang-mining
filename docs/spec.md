# lang-mining: Spec

## Goal
Share a link, text, or clip from an iPhone. Get a mobile-first Spanish study session mined from it: transcript view, vocabulary, idioms, verb conjugations with English and reflexive notes, quiz. One lesson per session in general Latin American Spanish. Dialect-specific idioms may come later.

## Scope
- DIY tool for Don and a few friends and family (fewer than 5 people), private repo. Each person has their own sign-in, lessons and deck
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
6. Status ready. Paragraphs and their English are stored with the lesson. The raw source copy is kept too, with no retention job
7. If a media job is queued and the Mac worker heartbeat is stale, show "waiting for home machine"

## Dialect handling
- Decision (Nov 2026): no dialect picker. One lesson per session, read as general Latin American Spanish
- sessions.dialect stays and holds a fixed default
- Idioms keep region_tags to say where they are used
- Parked for later: dialect-specific idioms, or a separate slang side with dialects

## Enrichment JSON schema
- summary: 2 to 3 sentence gist in English
- paragraphs[]: spanish (the source paragraph, split in code), english, key_phrase {spanish, english}, verbs[], vocab[], idioms[]. A help level (full, medium, light) sets how many words get glossed per paragraph, default light for Spanish and full for Farsi
  - vocab[]: lemma, surface_form, part_of_speech, english, example_fragment, level
  - idioms[]: phrase, literal_meaning, actual_meaning, region_tags[], register
  - verbs[]: infinitive, english, form_in_source, form_english, tense, mood, person, conjugation_table, irregular, reflexive (null, or infinitive_reflexive, english, kind, explanation)
- Farsi lessons use paragraphs[] too: persian (source), transliteration, english, key_phrase {persian, transliteration, english}, words[] (lemma, surface, transliteration, part_of_speech, english, level, register), verbs[] (with transliteration and a compound block), idioms[]. A help level (full, medium, light) sets how many words get glossed
- grammar_notes[]
- quiz[]: question, answer, type (vocab, idiom, verb, listening)

## Screens
- Login (name and passcode), Admin (owner only: add, reset passcode, remove people)
- Home: paste or upload box, recent sessions
- Session tabs: Read (paragraph reader, swipe right for the next paragraph), Vocab, Idioms, Verbs (the last three list items from all paragraphs), Quiz
- Tap a word: bottom sheet with lemma, meaning, conjugation, reflexive note
- Save to deck: vocab and idioms go to a persistent review list

## Tables
- app_users: id, name, name_key, passcode_hash, is_admin, token_version, failed_attempts, locked_until, created_at
- sessions: id, user_id, source_type, source_url, dialect, language, status, created_at
- source_texts: session_id, text, delete_after (nullable, unused since the retention job was removed)
- enrichments: session_id, dialect, json, model, created_at
- deck_items: id, kind, payload, dialect_tags, next_review_at
- worker_heartbeat: worker_id, last_seen

## Phasing
1. Text and article URL, enrichment, session UI (no audio)
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
