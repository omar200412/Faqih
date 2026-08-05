# Curriculum & Lesson Model — Design

Date: 2026-08-05
Status: Approved
Sub-project 1 of 8 in the Faqih rebuild (see "Rebuild roadmap" below for the full sequence).

## Context

Faqih is being rebuilt into a Duolingo-style app: short lessons plus test/game-style exercises, two selectable mascot characters (boy/girl), Turkish/English/Arabic, targeting Android and iOS. This is a multi-subsystem rebuild, not a single feature, so it's being decomposed into a sequence of sub-projects, each with its own design → plan → implementation cycle:

1. **Curriculum & lesson model** (this document)
2. Accounts & progress persistence
3. Gamification engine (XP, streaks, hearts, levels)
4. Mascot/character system
5. Localization completion (EN/AR content pipeline)
6. Native build & store readiness
7. Content production at scale

Foundation decision (made before this design): evolve the existing codebase — Django backend (`faqih_backend`) + Expo/React Native app (`faqih-frontend`) — rather than starting a clean technical slate. The existing API, content-authoring panel, and brand identity (deep green/gold on parchment, Georgia display type) are all kept and built on top of.

This document covers sub-project 1: restructuring content from a flat quiz list into a lesson-based curriculum.

## Current state (before this change)

- Data model: `Category → Unit → Question`, where `Question.question_type` is one of `mcq`, `true_false`, `matching`, `image`, `video`, `hotspot` (hotspot is legacy/half-supported, out of scope here).
- The Home screen renders each `Unit` as a single row a learner taps to start a quiz session covering all of that unit's questions at once.
- Gamification (XP, streak, level, achievements) is UI-only mock data (`ProfileScreen.js`, `HomeScreen.js`) — nothing is persisted per user yet. Real accounts don't exist.
- The content panel (`faqih_backend/panel/`) lets a non-technical author create Categories, Units, and Questions of each type, with a live phone preview.

## What changes

### 1. Data model

```
Category (course topic, e.g. "Namaz")
  └─ Unit (a skill/section, e.g. "Namaz Vakitleri")
       └─ Lesson (NEW — a short, single-session teaching unit, 5-10 exercises)
            ├─ intro_content: nullable — optional teaching moment
            │     kind: text | image | video
            │     body: text / image (DB-stored binary, same as Exercise
            │           image data below) / YouTube URL
            └─ Exercise (renamed from Question)
                  type: mcq | true_false | matching | image | video
                       | ordering (NEW) | fill_blank (NEW)
                  prompt, options_json, correct_answer, explanation
```

- `Lesson` is new, inserted between `Unit` and `Exercise` (renamed from `Question`).
- `intro_content` is nullable per-lesson. The panel author decides, per lesson, whether it needs a teaching screen before its exercises, or can go straight into exercises. Both patterns are supported — this was an explicit design choice (not defaulting to always-teach or never-teach).
- Two new exercise types:
  - **ordering** — drag steps into the correct sequence (e.g. the steps of wudu or prayer, where sequence is the substance of the question).
  - **fill_blank** — tap words from a word bank to complete a sentence.
- `Category` and `Unit` keep their current meaning and are unchanged structurally.
- Follows the existing single-table-with-`options_json` pattern rather than a strict polymorphic per-type schema. That pattern has already absorbed five exercise types cleanly; a fully polymorphic redesign would mean rewriting every panel form for no proven benefit (YAGNI).
- `Question.correct_option` is renamed `correct_answer` on the renamed `Exercise` model — "option" doesn't fit `ordering` (a sequence) or `fill_blank` (one or more words), so the field is renamed to something type-neutral. This is a straight rename, not a behavior change, and is part of the same migration that introduces `Lesson`.

### 2. Unlock logic & the path map

- Unlock rule: within a `Unit`, `Lesson[n+1]` unlocks when `Lesson[n]` is completed. Across `Unit`s, the first lesson of `Unit[n+1]` unlocks when the last lesson of `Unit[n]` is completed. Same linked-list logic the app already applies to units today, just one level deeper.
- The **path map is a presentation layer, not new data or new backend logic.** The Home screen renders `Category → Unit → Lesson` as a winding path with nodes (Duolingo-style visual), but the underlying prerequisite check is still "is the previous lesson done." No branching prerequisite graph — sequential unlock underneath, path-shaped on screen. This was an explicit choice over true branching (multiple lessons unlocking simultaneously), to keep prerequisite logic simple.
- **Checkpoint nodes**: visually distinct nodes on the path (e.g. at the end of a `Unit`) — a presentation detail, not a new data type. A checkpoint *review* mechanic (mixing exercises from prior lessons into a review lesson) is a good future idea but is deferred to the content-production phase, since it can be modeled later as just another `Lesson` sourcing exercises from earlier ones — no model change needed now.
- Node states (locked / unlocked-next / completed) are derived from the same "previous lesson done" check — no new state machine.

### 3. Lesson session flow

Client-side, ephemeral session state — nothing persisted yet (persistence is sub-project 2, Accounts & Progress):

1. On lesson start: if `intro_content` is set, show it first. Skippable forward, not skippable past without viewing.
2. Build a queue of the lesson's exercises in order.
3. On each answer: show correct/incorrect immediately with the explanation (unchanged from today's quiz behavior).
4. **If wrong**, push that exercise back into the queue at a later position (not immediately next).
5. Lesson is complete when the queue is empty — every exercise has been answered correctly at least once.
6. On completion: a summary screen (exercise count, mistake count). No XP/streak numbers yet — that needs real accounts. Fires a `LESSON_COMPLETED` event, currently a no-op hook, which is the seam the gamification phase (sub-project 3) attaches to.
7. **Exiting mid-lesson**: re-entering always restarts the lesson clean. No session save/restore. This was chosen deliberately as the simpler starting point — it fits the "short lesson" design (5-10 exercises, a minute or two) and is a pure subtraction from a future "resume mid-lesson" feature (which would only add a save/restore step on top of the same queue mechanism, not require redesigning it). Resume-mid-lesson can be added later without rework.

### 4. API & panel changes

- The unit endpoint response gains one nesting level: units return lessons, each lesson returns its exercises. Same REST shape and legacy-format normalization pattern already in `content/serializers.py`, just one level deeper.
- No new endpoints.
- Panel gains the same pattern one level deeper: author picks a Unit, adds Lessons to it, then adds Exercises to each Lesson, optionally setting `intro_content`. The two new exercise types get panel form fields following the same pattern used to add image/video/matching previously.
- The panel's existing live phone preview extends to preview a full lesson flow rather than a single question.

### 5. Error handling

- Malformed/missing `intro_content`: treated as absent, lesson starts directly at exercises. No error surfaced to the learner.
- API failure loading a lesson: same fallback pattern the app already uses (mock/cached data, friendly retry) — no new failure mode, since lesson content loads once at lesson start.
- Malformed `options_json` for `ordering`/`fill_blank`: rejected at panel save time with an inline error, matching validation for existing exercise types.

### 6. Data migration

Existing `Unit → Question` rows are migrated non-destructively: each unit's existing questions are wrapped into a single default `Lesson` per unit, so nothing existing breaks. Re-authoring the curriculum into properly-sized, purposeful lessons happens later, in the content-production phase (sub-project 7).

### 7. Testing

- Backend: serializer tests for the new Lesson nesting and the two new exercise types, following the existing pattern in `content/tests.py`.
- Frontend: a focused unit test for the mistake-queue logic (push wrong answers back, complete when queue empties) — the trickiest new behavior, and independent of UI.
- Manual: one full lesson walked end-to-end in the Expo web preview per exercise type, including the resurfaced-mistake path.

## Explicitly out of scope for this sub-project

- User accounts, saved/persisted progress, XP, streaks, hearts, levels, achievements (sub-project 2 and 3).
- Mascot characters and their appearances in the lesson flow (sub-project 4) — the `LESSON_COMPLETED` event and lesson-flow structure are designed to leave room for this, but no mascot work happens here.
- True branching prerequisite graphs.
- Checkpoint review lessons (mixing exercises from multiple prior lessons).
- Resume-mid-lesson.
- Localization content for EN/AR, native builds, and content production at scale (sub-projects 5-7).
- The legacy `hotspot` exercise type (unresolved decision from the earlier status review, tracked separately).
