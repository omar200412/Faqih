# Home Screen Redesign + Hearts/Gems Progress System

Status: Approved
Date: 2026-08-06

## Context

The user supplied five reference screens from a Google Stitch mockup ("FiqhQuest"
branding) showing a Duolingo-style home screen: a bright-green header with
streak/gem/heart pills, a "Unit 1" banner card, a winding path of circular
lesson nodes, and a 4-tab bottom nav (Home / Courses / Quests / Profile).

The live app (`faqih-frontend`) currently has:
- A single stack navigator (Home → Lesson → Profile), no bottom tabs.
- A card-style home screen: category header bars + rectangular lesson nodes
  in a loose zigzag, no circular path or connector line.
- A `USER` object hardcoded as a JS constant in `HomeScreen.js` /
  `ProfileScreen.js` (name, xp, streak, completedLessons) — **no persistence
  anywhere in the app**, no backend user/progress model, no login.
- No gems, no hearts (lives) concept at all.

This spec covers one decomposed slice of the full mockup: the **home screen
visual redesign** plus the **backend/state work needed to make hearts and
gems real** (the user chose full functionality over a cosmetic-only pass).
Explicitly out of scope, tracked as follow-up work: Courses tab content,
Quests/Daily-Goal screen content, the mascot-led lesson-intro chat UI,
rebranding to "FiqhQuest", and Arabic content — the mockup's branding/
language is a style reference only; the app keeps its "Faqih" name and
Turkish content.

## Decisions (from brainstorming)

- Gems and hearts are fully functional, not decorative.
- Progress state is backend-persisted (Django), not device-local-only,
  because the user explicitly chose that over AsyncStorage-only.
- User identity is an anonymous device ID generated on first launch — no
  login/password screens.
- At 0 hearts, further questions are blocked until refill.
- Hearts regenerate on a timer (1 per 30 minutes) rather than a daily reset
  or gem-only refill.
- Gems are earned per completed lesson and spendable only on instant heart
  refills (closed, simple economy — no other sink yet).
- Branding stays "Faqih" / Turkish; the mockup is a visual/layout reference,
  not a literal rebrand.
- A bottom tab bar is added (required for the home screen to match the
  mockup's chrome), but Courses and Quests tabs are thin placeholder screens
  in this pass — their real content is separate future work.

## Architecture

### Backend: `UserProgress` model (`faqih_backend/content/`)

```python
class UserProgress(models.Model):
    device_id            = models.CharField(max_length=64, unique=True)
    hearts                = models.PositiveSmallIntegerField(default=3)
    hearts_max            = models.PositiveSmallIntegerField(default=3)
    last_heart_lost_at    = models.DateTimeField(null=True, blank=True)
    gems                  = models.PositiveIntegerField(default=0)
    xp                    = models.PositiveIntegerField(default=0)
    streak                = models.PositiveIntegerField(default=0)
    completed_lesson_ids  = models.JSONField(default=list)
```

Heart regeneration is computed lazily on read, not via a background job:
on every `GET`, if `hearts < hearts_max` and `last_heart_lost_at` is set,
compute `elapsed // 30min` hearts to restore, cap at `hearts_max`, and clear
`last_heart_lost_at` once full. This keeps the model simple and avoids
needing Celery/cron for a single-digit-user app.

### Endpoints (`faqih_backend/content/`, mirrors existing API shape)

- `GET /api/progress/<device_id>/` — fetch-or-create a `UserProgress` row,
  applying lazy heart regen before returning.
- `POST /api/progress/<device_id>/answer/` — body `{correct: bool}`; on
  wrong, decrement hearts (floor 0) and set `last_heart_lost_at` if it
  wasn't already set; on correct, add XP. Returns the updated progress.
- `POST /api/progress/<device_id>/complete-lesson/` — body
  `{lesson_id: int}`; appends to `completed_lesson_ids` if new, awards a
  fixed gem amount (e.g. +10). Returns updated progress.
- `POST /api/progress/<device_id>/refill-hearts/` — spends a fixed gem
  amount (e.g. 50) to set `hearts = hearts_max` immediately if the user has
  enough gems; 400 if not.

Serializer mirrors the model fields directly (no legacy-format normalization
needed here, unlike `content/serializers.py`'s question handling).

### Frontend: device identity

`API.js` gains `getDeviceId()`: reads a UUID from AsyncStorage, generating
one via `Crypto.randomUUID()` (from `expo-crypto`, new dependency) and
persisting it on first call — same pattern already used for the language
preference. Every progress call passes this ID.

A small `useProgress()` hook (new file, `src/logic/useProgress.js`) wraps
the four endpoints and exposes `{ progress, loading, reportAnswer,
completeLesson, refillHearts }` to `HomeScreen` and `LessonScreen`,
replacing the hardcoded `USER` constants in both.

### Hearts blocking UX (`LessonScreen.js`)

`settle()` already knows right/wrong at the point it's called. On wrong,
it now also calls `reportAnswer(false)`. If the returned `hearts === 0`,
the screen renders a new "out of hearts" branch instead of the normal
feedback panel: a card (reusing existing `questionCard`/`feedbackPanel`
styling) showing a countdown to the next regenerated heart (derived from
`last_heart_lost_at + 30min`) and, if `gems >= refill cost`, a "refill with
gems" button that calls `refillHearts()` and resumes the lesson.

### Home screen redesign (`HomeScreen.js`, `theme.js`)

- `theme.js`: add a brighter primary green alongside existing tokens
  (e.g. `primary: '#58CC02'`-family), keeping `radius`/`shadow`/`spacing`
  unchanged so other screens aren't affected beyond the color shift.
- Header: hamburger icon (opens the existing `LanguagePicker` for now,
  no new menu) + wordmark, replacing the greeting text. Three pills read
  from `useProgress()`: 🔥 streak, 💎 gems, ❤️ hearts.
- Unit banner: rounded green card with unit title + "Continue" button,
  replacing the flat `categoryHeader` bar, using the first
  not-yet-completed unit.
- Skill path: circular nodes (done = filled + check, current = larger with
  a pulse ring, locked = grey + lock icon) connected by a winding line
  drawn with `react-native-svg` (new dependency), with each lesson's title
  in a floating pill beside its node. Replaces the current
  `node`/`nodeDone`/`nodeLocked` card styles; unlock logic
  (`lessonNodeState`) is unchanged, only reads `completed_lesson_ids` from
  `useProgress()` instead of the hardcoded array.
- Bottom tab bar: `@react-navigation/bottom-tabs` (new dependency) added
  in `App.js`, wrapping the existing stack as the "Home" tab's stack.
  Courses and Quests are new placeholder screens (`src/screens/
  CoursesScreen.js`, `src/screens/QuestsScreen.js`) each rendering a
  simple "coming soon" card in the app's existing style. Profile tab
  points at the existing `ProfileScreen` unchanged.

## Data flow

1. App launch → `getDeviceId()` resolves/generates the ID →
   `useProgress()` fetches `GET /api/progress/<id>/` (regen applied
   server-side) → Home renders pills + path from that response.
2. Wrong answer in a lesson → `reportAnswer(false)` →
   `POST .../answer/` → hearts decremented server-side → response updates
   local progress state → if 0, blocking UI shown.
3. Lesson finished → `completeLesson(lessonId)` →
   `POST .../complete-lesson/` → gems + completed list updated → Home
   re-fetches on next focus (or receives the response directly) so the
   path reflects the newly unlocked next lesson.

## Error handling

- Progress fetch failure on launch: Home falls back to a zero-state
  (3 hearts, 0 gems, empty completed list) rather than blocking the whole
  app — matches the existing pattern of graceful `getCategories`/`getUnit`
  failures.
- `refill-hearts` with insufficient gems: backend returns 400 with a
  message; frontend disables the refill button when
  `gems < cost` client-side so this is a defensive-only path.
- Device ID generation failure: extremely unlikely (`expo-crypto` is
  synchronous/local), not specifically handled beyond normal promise
  rejection surfacing as the launch fallback above.

## Testing

- Backend: unit tests in `content/tests.py` (or a new `progress` test
  module) for heart regen math at elapsed-time boundaries (0 min, 29 min,
  30 min, 90 min, already-full), gems earn-on-complete (including the
  "already completed, don't double-award" case), and refill success/
  insufficient-funds.
- Frontend: manual verification via the existing Expo web preview
  workflow (`npx expo start --web`, already documented in project memory)
  — click through a lesson answering wrong until hearts hit 0, confirm the
  blocking card and countdown appear; confirm gems increment after a
  lesson completes; confirm the bottom tabs render and Courses/Quests show
  their placeholder cards.

## Follow-up work (explicitly deferred)

- Courses tab real content.
- Quests tab / Daily Goal ring screen.
- Mascot-led chat-style lesson intro.
- FiqhQuest rebrand + Arabic content, if ever wanted.
