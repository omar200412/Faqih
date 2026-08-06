# Home Screen Redesign + Hearts/Gems Progress System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Faqih home screen to match the FiqhQuest mockup (header pills, unit banner, circular skill path, bottom tabs) backed by a new, real hearts/gems progress system.

**Architecture:** A new Django `UserProgress` model (keyed by an anonymous device ID) backs four REST endpoints (fetch/answer/complete-lesson/refill-hearts) with lazy, read-time heart regeneration. The frontend gets a `useProgress()` hook wrapping those endpoints, a new `SkillPath` component for the circular node path, a redesigned `HomeScreen`, hearts-aware wiring in `LessonScreen`, and a new bottom tab bar with placeholder Courses/Quests screens.

**Tech Stack:** Django REST Framework (backend), React Native / Expo, `@react-navigation/bottom-tabs`, `react-native-svg`, `expo-crypto`, `@react-native-async-storage/async-storage` (already present).

## Global Constraints

- Branding stays "Faqih" / Turkish; do not rename to "FiqhQuest" or introduce Arabic content.
- Device identity is an anonymous UUID stored in AsyncStorage — no login/password screens.
- Hearts regenerate 1 per 30 minutes (`HEART_REGEN_MINUTES = 30`).
- Gems awarded per completed lesson: 10 (`GEMS_PER_LESSON = 10`).
- Heart refill cost: 50 gems (`HEART_REFILL_COST = 50`).
- At 0 hearts, further questions are blocked until refill (time-based regen or gem spend).
- Courses and Quests tabs are placeholder screens only in this pass — no real content.
- Follow existing project conventions: pure logic in `src/logic/*.js` (CommonJS, no RN imports, tested with `node --test`), Turkish-first copy mirrored into `en.js`/`ar.js`, DRF `ReadOnlyModelViewSet`/router patterns as used in `content/views.py` and `content/urls.py`.
- Spec: `docs/superpowers/specs/2026-08-06-home-redesign-progress-system-design.md`.

---

## Backend

### Task 1: `UserProgress` model with heart-regen logic

**Files:**
- Modify: `faqih_backend/content/models.py`
- Test: `faqih_backend/content/tests.py`

**Interfaces:**
- Produces: `UserProgress` model with fields `device_id` (str, unique), `hearts` (int, default 3), `hearts_max` (int, default 3), `last_heart_lost_at` (datetime, nullable), `gems` (int, default 0), `xp` (int, default 0), `streak` (int, default 0), `completed_lesson_ids` (JSON list, default `[]`); method `apply_heart_regen()` (mutates in place, caller must `.save()`); module constants `HEART_REGEN_MINUTES = 30`, `GEMS_PER_LESSON = 10`, `HEART_REFILL_COST = 50`.

- [ ] **Step 1: Write the failing tests**

Append to `faqih_backend/content/tests.py`:

```python
from datetime import timedelta
from django.utils import timezone


class UserProgressModelTests(TestCase):
    def test_defaults_on_creation(self):
        from .models import UserProgress
        p = UserProgress.objects.create(device_id='dev-1')
        self.assertEqual(p.hearts, 3)
        self.assertEqual(p.hearts_max, 3)
        self.assertEqual(p.gems, 0)
        self.assertEqual(p.xp, 0)
        self.assertEqual(p.streak, 0)
        self.assertEqual(p.completed_lesson_ids, [])
        self.assertIsNone(p.last_heart_lost_at)

    def test_regen_does_nothing_before_30_minutes(self):
        from .models import UserProgress
        p = UserProgress.objects.create(
            device_id='dev-2', hearts=1,
            last_heart_lost_at=timezone.now() - timedelta(minutes=29),
        )
        p.apply_heart_regen()
        self.assertEqual(p.hearts, 1)
        self.assertIsNotNone(p.last_heart_lost_at)

    def test_regen_restores_one_heart_after_30_minutes(self):
        from .models import UserProgress
        p = UserProgress.objects.create(
            device_id='dev-3', hearts=1,
            last_heart_lost_at=timezone.now() - timedelta(minutes=31),
        )
        p.apply_heart_regen()
        self.assertEqual(p.hearts, 2)
        self.assertIsNotNone(p.last_heart_lost_at)  # not yet full, keeps a timestamp

    def test_regen_caps_at_hearts_max_and_clears_timestamp(self):
        from .models import UserProgress
        p = UserProgress.objects.create(
            device_id='dev-4', hearts=2, hearts_max=3,
            last_heart_lost_at=timezone.now() - timedelta(hours=5),
        )
        p.apply_heart_regen()
        self.assertEqual(p.hearts, 3)
        self.assertIsNone(p.last_heart_lost_at)

    def test_regen_is_noop_when_already_full(self):
        from .models import UserProgress
        p = UserProgress.objects.create(device_id='dev-5', hearts=3, hearts_max=3)
        p.apply_heart_regen()
        self.assertEqual(p.hearts, 3)
        self.assertIsNone(p.last_heart_lost_at)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd faqih_backend && python manage.py test content.UserProgressModelTests -v 2`
Expected: FAIL / ERROR — `UserProgress` does not exist yet (`ImportError` or `AttributeError`).

- [ ] **Step 3: Add the model**

Append to `faqih_backend/content/models.py`:

```python
from django.utils import timezone
from datetime import timedelta

HEART_REGEN_MINUTES = 30
GEMS_PER_LESSON = 10
HEART_REFILL_COST = 50


class UserProgress(models.Model):
    device_id            = models.CharField(max_length=64, unique=True, verbose_name='Cihaz Kimliği')
    hearts               = models.PositiveSmallIntegerField(default=3, verbose_name='Can')
    hearts_max           = models.PositiveSmallIntegerField(default=3, verbose_name='Azami Can')
    last_heart_lost_at   = models.DateTimeField(null=True, blank=True, verbose_name='Son Can Kaybı')
    gems                 = models.PositiveIntegerField(default=0, verbose_name='Elmas')
    xp                   = models.PositiveIntegerField(default=0, verbose_name='XP')
    streak               = models.PositiveIntegerField(default=0, verbose_name='Seri')
    completed_lesson_ids = models.JSONField(default=list, verbose_name='Tamamlanan Dersler')

    class Meta:
        verbose_name        = 'Kullanıcı İlerlemesi'
        verbose_name_plural = 'Kullanıcı İlerlemeleri'

    def __str__(self):
        return self.device_id

    def apply_heart_regen(self):
        """Restores hearts earned by elapsed time since the last loss.
        Mutates in place; caller is responsible for calling save()."""
        if self.hearts >= self.hearts_max or self.last_heart_lost_at is None:
            return
        regen_seconds = HEART_REGEN_MINUTES * 60
        elapsed = (timezone.now() - self.last_heart_lost_at).total_seconds()
        regenerated = int(elapsed // regen_seconds)
        if regenerated <= 0:
            return
        self.hearts = min(self.hearts_max, self.hearts + regenerated)
        if self.hearts >= self.hearts_max:
            self.last_heart_lost_at = None
        else:
            remainder = elapsed % regen_seconds
            self.last_heart_lost_at = timezone.now() - timedelta(seconds=remainder)
```

- [ ] **Step 4: Generate and apply the migration**

Run: `cd faqih_backend && python manage.py makemigrations content`
Expected: creates `content/migrations/000X_userprogress.py` adding the `UserProgress` model.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd faqih_backend && python manage.py test content.UserProgressModelTests -v 2`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add faqih_backend/content/models.py faqih_backend/content/migrations/ faqih_backend/content/tests.py
git commit -m "feat(backend): add UserProgress model with lazy heart regeneration"
```

---

### Task 2: `GET /api/progress/<device_id>/` fetch-or-create endpoint

**Files:**
- Modify: `faqih_backend/content/serializers.py`
- Modify: `faqih_backend/content/views.py`
- Modify: `faqih_backend/content/urls.py`
- Test: `faqih_backend/content/tests.py`

**Interfaces:**
- Consumes: `UserProgress`, `UserProgress.apply_heart_regen()` (Task 1).
- Produces: `UserProgressSerializer` (fields: `device_id, hearts, hearts_max, last_heart_lost_at, gems, xp, streak, completed_lesson_ids`); `UserProgressViewSet` with `_get_or_create(device_id)` helper and `retrieve()`; route `GET /api/progress/<device_id>/`.

- [ ] **Step 1: Write the failing test**

Append to `faqih_backend/content/tests.py`:

```python
from rest_framework.test import APITestCase


class UserProgressAPITests(APITestCase):
    def test_get_creates_progress_with_defaults_on_first_call(self):
        res = self.client.get('/api/progress/new-device/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['hearts'], 3)
        self.assertEqual(res.data['gems'], 0)
        self.assertEqual(res.data['completed_lesson_ids'], [])

    def test_get_applies_regen_before_returning(self):
        from .models import UserProgress
        UserProgress.objects.create(
            device_id='regen-device', hearts=1,
            last_heart_lost_at=timezone.now() - timedelta(minutes=31),
        )
        res = self.client.get('/api/progress/regen-device/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['hearts'], 2)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd faqih_backend && python manage.py test content.UserProgressAPITests -v 2`
Expected: FAIL — 404 (no `progress` route registered yet).

- [ ] **Step 3: Add the serializer**

Append to `faqih_backend/content/serializers.py`:

```python
from .models import UserProgress


class UserProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProgress
        fields = [
            'device_id', 'hearts', 'hearts_max', 'last_heart_lost_at',
            'gems', 'xp', 'streak', 'completed_lesson_ids',
        ]
```

(Add `UserProgress` to the existing `from .models import Category, Unit, Lesson, Exercise` line instead of a second import line.)

- [ ] **Step 4: Add the viewset**

Append to `faqih_backend/content/views.py`:

```python
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import UserProgress, GEMS_PER_LESSON, HEART_REFILL_COST
from .serializers import UserProgressSerializer


class UserProgressViewSet(viewsets.ViewSet):
    """
    Anonymous, device-id-keyed progress (hearts/gems/xp).
    Endpoint: /api/progress/<device_id>/
    """

    def _get_or_create(self, device_id):
        obj, _ = UserProgress.objects.get_or_create(device_id=device_id)
        obj.apply_heart_regen()
        obj.save()
        return obj

    def retrieve(self, request, pk=None):
        obj = self._get_or_create(pk)
        return Response(UserProgressSerializer(obj).data)
```

(Add these imports to the existing top-of-file imports rather than duplicating `viewsets`.)

- [ ] **Step 5: Register the route**

Modify `faqih_backend/content/urls.py`:

```python
from .views import (
    CategoryViewSet, UnitViewSet, LessonViewSet, ExerciseViewSet,
    UserProgressViewSet,
    question_image, lesson_intro_image,
)

router = DefaultRouter()
router.register(r'categories', CategoryViewSet)
router.register(r'units', UnitViewSet)
router.register(r'lessons', LessonViewSet)
router.register(r'questions', ExerciseViewSet)
router.register(r'progress', UserProgressViewSet, basename='progress')
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd faqih_backend && python manage.py test content.UserProgressAPITests -v 2`
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add faqih_backend/content/serializers.py faqih_backend/content/views.py faqih_backend/content/urls.py faqih_backend/content/tests.py
git commit -m "feat(backend): add GET /api/progress/<device_id>/ fetch-or-create endpoint"
```

---

### Task 3: `POST /api/progress/<device_id>/answer/`

**Files:**
- Modify: `faqih_backend/content/views.py`
- Test: `faqih_backend/content/tests.py`

**Interfaces:**
- Consumes: `UserProgressViewSet._get_or_create` (Task 2).
- Produces: `answer` action at `POST /api/progress/<device_id>/answer/`, body `{"correct": bool}`, returns the same shape as `GET`.

- [ ] **Step 1: Write the failing tests**

Append to `UserProgressAPITests` in `faqih_backend/content/tests.py`:

```python
    def test_wrong_answer_decrements_hearts_and_sets_timestamp(self):
        res = self.client.post('/api/progress/wrong-answer-device/answer/', {'correct': False}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['hearts'], 2)
        self.assertIsNotNone(res.data['last_heart_lost_at'])

    def test_correct_answer_adds_xp_and_does_not_touch_hearts(self):
        res = self.client.post('/api/progress/correct-answer-device/answer/', {'correct': True}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['hearts'], 3)
        self.assertEqual(res.data['xp'], 10)

    def test_hearts_never_go_below_zero(self):
        from .models import UserProgress
        UserProgress.objects.create(device_id='zero-hearts-device', hearts=0)
        res = self.client.post('/api/progress/zero-hearts-device/answer/', {'correct': False}, format='json')
        self.assertEqual(res.data['hearts'], 0)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd faqih_backend && python manage.py test content.UserProgressAPITests -v 2`
Expected: FAIL — 404 (no `answer` action yet).

- [ ] **Step 3: Add the action**

Append inside `UserProgressViewSet` in `faqih_backend/content/views.py`:

```python
    @action(detail=True, methods=['post'])
    def answer(self, request, pk=None):
        obj = self._get_or_create(pk)
        if request.data.get('correct'):
            obj.xp += 10
        elif obj.hearts > 0:
            obj.hearts -= 1
            if obj.last_heart_lost_at is None:
                obj.last_heart_lost_at = timezone.now()
        obj.save()
        return Response(UserProgressSerializer(obj).data)
```

(Add `from django.utils import timezone` to the top of `views.py`.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd faqih_backend && python manage.py test content.UserProgressAPITests -v 2`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add faqih_backend/content/views.py faqih_backend/content/tests.py
git commit -m "feat(backend): add POST /api/progress/<device_id>/answer/ endpoint"
```

---

### Task 4: `POST /api/progress/<device_id>/complete-lesson/`

**Files:**
- Modify: `faqih_backend/content/views.py`
- Test: `faqih_backend/content/tests.py`

**Interfaces:**
- Consumes: `UserProgressViewSet._get_or_create`, `GEMS_PER_LESSON` (Tasks 1–2).
- Produces: `complete_lesson` action at `POST /api/progress/<device_id>/complete-lesson/`, body `{"lesson_id": int}`.

- [ ] **Step 1: Write the failing tests**

Append to `UserProgressAPITests`:

```python
    def test_completing_a_lesson_awards_gems_and_records_it(self):
        res = self.client.post(
            '/api/progress/complete-device/complete-lesson/', {'lesson_id': 7}, format='json'
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['gems'], 10)
        self.assertEqual(res.data['completed_lesson_ids'], [7])

    def test_completing_the_same_lesson_twice_does_not_double_award(self):
        self.client.post('/api/progress/repeat-device/complete-lesson/', {'lesson_id': 3}, format='json')
        res = self.client.post('/api/progress/repeat-device/complete-lesson/', {'lesson_id': 3}, format='json')
        self.assertEqual(res.data['gems'], 10)
        self.assertEqual(res.data['completed_lesson_ids'], [3])
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd faqih_backend && python manage.py test content.UserProgressAPITests -v 2`
Expected: FAIL — 404 (no `complete-lesson` action yet).

- [ ] **Step 3: Add the action**

Append inside `UserProgressViewSet`:

```python
    @action(detail=True, methods=['post'], url_path='complete-lesson')
    def complete_lesson(self, request, pk=None):
        obj = self._get_or_create(pk)
        lesson_id = request.data.get('lesson_id')
        if lesson_id is not None and lesson_id not in obj.completed_lesson_ids:
            obj.completed_lesson_ids.append(lesson_id)
            obj.gems += GEMS_PER_LESSON
            obj.save()
        return Response(UserProgressSerializer(obj).data)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd faqih_backend && python manage.py test content.UserProgressAPITests -v 2`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add faqih_backend/content/views.py faqih_backend/content/tests.py
git commit -m "feat(backend): add POST /api/progress/<device_id>/complete-lesson/ endpoint"
```

---

### Task 5: `POST /api/progress/<device_id>/refill-hearts/`

**Files:**
- Modify: `faqih_backend/content/views.py`
- Test: `faqih_backend/content/tests.py`

**Interfaces:**
- Consumes: `UserProgressViewSet._get_or_create`, `HEART_REFILL_COST` (Tasks 1–2).
- Produces: `refill_hearts` action at `POST /api/progress/<device_id>/refill-hearts/` — 200 with progress on success, 400 `{"detail": "..."}` on insufficient gems.

- [ ] **Step 1: Write the failing tests**

Append to `UserProgressAPITests`:

```python
    def test_refill_spends_gems_and_maxes_hearts(self):
        from .models import UserProgress
        UserProgress.objects.create(device_id='refill-device', hearts=0, gems=60)
        res = self.client.post('/api/progress/refill-device/refill-hearts/', {}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['hearts'], 3)
        self.assertEqual(res.data['gems'], 10)
        self.assertIsNone(res.data['last_heart_lost_at'])

    def test_refill_fails_with_insufficient_gems(self):
        from .models import UserProgress
        UserProgress.objects.create(device_id='poor-device', hearts=0, gems=10)
        res = self.client.post('/api/progress/poor-device/refill-hearts/', {}, format='json')
        self.assertEqual(res.status_code, 400)
        UserProgress.objects.get(device_id='poor-device').refresh_from_db()
        p = UserProgress.objects.get(device_id='poor-device')
        self.assertEqual(p.hearts, 0)
        self.assertEqual(p.gems, 10)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd faqih_backend && python manage.py test content.UserProgressAPITests -v 2`
Expected: FAIL — 404 (no `refill-hearts` action yet).

- [ ] **Step 3: Add the action**

Append inside `UserProgressViewSet`:

```python
    @action(detail=True, methods=['post'], url_path='refill-hearts')
    def refill_hearts(self, request, pk=None):
        obj = self._get_or_create(pk)
        if obj.gems < HEART_REFILL_COST:
            return Response({'detail': 'Yetersiz elmas'}, status=400)
        obj.gems -= HEART_REFILL_COST
        obj.hearts = obj.hearts_max
        obj.last_heart_lost_at = None
        obj.save()
        return Response(UserProgressSerializer(obj).data)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd faqih_backend && python manage.py test content.UserProgressAPITests -v 2`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add faqih_backend/content/views.py faqih_backend/content/tests.py
git commit -m "feat(backend): add POST /api/progress/<device_id>/refill-hearts/ endpoint"
```

---

## Frontend

### Task 6: Device ID helper + progress API client functions

**Files:**
- Modify: `faqih-frontend/package.json` (via `npx expo install expo-crypto`)
- Modify: `faqih-frontend/src/API.js`

**Interfaces:**
- Consumes: backend endpoints from Tasks 2–5.
- Produces: `getDeviceId(): Promise<string>`, `getProgress(deviceId): Promise<Progress>`, `postAnswer(deviceId, correct): Promise<Progress>`, `postCompleteLesson(deviceId, lessonId): Promise<Progress>`, `postRefillHearts(deviceId): Promise<{ok: boolean, progress?: Progress, detail?: string}>`, and `DEFAULT_PROGRESS` (the `{device_id, hearts, hearts_max, last_heart_lost_at, gems, xp, streak, completed_lesson_ids}` zero-state shape) — all exported from `src/API.js`. This is the only file allowed to know the wire format.

- [ ] **Step 1: Install `expo-crypto`**

Run: `cd faqih-frontend && npx expo install expo-crypto`
Expected: adds `expo-crypto` to `package.json` dependencies at the Expo-SDK-compatible version.

- [ ] **Step 2: Add device ID + progress functions**

Append to `faqih-frontend/src/API.js` (add `import AsyncStorage from '@react-native-async-storage/async-storage';` and `import * as Crypto from 'expo-crypto';` to the top of the file, alongside the existing `axios` import):

```js
// ── Device identity & progress ──────────────────────────────────────────────

const DEVICE_ID_KEY = '@faqih_device_id';

export async function getDeviceId() {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const id = Crypto.randomUUID();
  await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  return id;
}

export const DEFAULT_PROGRESS = {
  device_id: null,
  hearts: 3,
  hearts_max: 3,
  last_heart_lost_at: null,
  gems: 0,
  xp: 0,
  streak: 0,
  completed_lesson_ids: [],
};

export async function getProgress(deviceId) {
  try {
    const res = await client.get(`/api/progress/${deviceId}/`);
    return res.data;
  } catch {
    console.warn('Progress API unavailable — using default progress');
    return DEFAULT_PROGRESS;
  }
}

export async function postAnswer(deviceId, correct) {
  try {
    const res = await client.post(`/api/progress/${deviceId}/answer/`, { correct });
    return res.data;
  } catch {
    console.warn('Progress API unavailable — answer not recorded');
    return null;
  }
}

export async function postCompleteLesson(deviceId, lessonId) {
  try {
    const res = await client.post(`/api/progress/${deviceId}/complete-lesson/`, { lesson_id: lessonId });
    return res.data;
  } catch {
    console.warn('Progress API unavailable — lesson completion not recorded');
    return null;
  }
}

export async function postRefillHearts(deviceId) {
  try {
    const res = await client.post(`/api/progress/${deviceId}/refill-hearts/`, {});
    return { ok: true, progress: res.data };
  } catch (err) {
    return { ok: false, detail: err.response?.data?.detail ?? 'Yenileme başarısız oldu' };
  }
}
```

- [ ] **Step 3: Manually verify**

Run the backend locally (`cd faqih_backend && python manage.py runserver 0.0.0.0:8000`), temporarily point `BASE_URL` in `faqih-frontend/src/API.js` at it (e.g. `http://localhost:8000` for web preview), then in the Expo web preview's browser console run:

```js
await import('./src/API.js').then(m => m.getDeviceId())
```

Expected: returns a UUID string; calling it twice returns the same value (confirms AsyncStorage persistence). Revert the `BASE_URL` change before committing if you changed it for this check.

- [ ] **Step 4: Commit**

```bash
git add faqih-frontend/package.json faqih-frontend/package-lock.json faqih-frontend/src/API.js
git commit -m "feat(frontend): add device-id identity and progress API client functions"
```

---

### Task 7: Pure hearts-countdown logic

**Files:**
- Create: `faqih-frontend/src/logic/heartsCountdown.js`
- Test: `faqih-frontend/src/logic/heartsCountdown.test.js`

**Interfaces:**
- Produces: `minutesUntilNextHeart(lastHeartLostAtIso, now = new Date())` → integer minutes remaining (0 if `lastHeartLostAtIso` is falsy); `HEART_REGEN_MINUTES` constant (30, mirrors the backend value).

- [ ] **Step 1: Write the failing test**

Create `faqih-frontend/src/logic/heartsCountdown.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { minutesUntilNextHeart } = require('./heartsCountdown');

test('returns 0 when no heart has been lost', () => {
  assert.equal(minutesUntilNextHeart(null), 0);
});

test('returns close to 30 minutes right after a heart is lost', () => {
  const now = new Date('2026-08-06T12:00:00Z');
  const lostAt = new Date('2026-08-06T12:00:00Z').toISOString();
  assert.equal(minutesUntilNextHeart(lostAt, now), 30);
});

test('counts down as time passes', () => {
  const lostAt = new Date('2026-08-06T12:00:00Z').toISOString();
  const now = new Date('2026-08-06T12:20:00Z');
  assert.equal(minutesUntilNextHeart(lostAt, now), 10);
});

test('wraps to the next 30-minute window once one has elapsed', () => {
  const lostAt = new Date('2026-08-06T12:00:00Z').toISOString();
  const now = new Date('2026-08-06T12:45:00Z');
  assert.equal(minutesUntilNextHeart(lostAt, now), 15);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd faqih-frontend && node --test src/logic/heartsCountdown.test.js`
Expected: FAIL — `Cannot find module './heartsCountdown'`.

- [ ] **Step 3: Implement**

Create `faqih-frontend/src/logic/heartsCountdown.js`:

```js
// src/logic/heartsCountdown.js — pure countdown math for the "out of hearts" UI.
// No React/RN imports on purpose: unit-tested directly with `node --test`.
// Mirrors HEART_REGEN_MINUTES in faqih_backend/content/models.py.

const HEART_REGEN_MINUTES = 30;

function minutesUntilNextHeart(lastHeartLostAtIso, now = new Date()) {
  if (!lastHeartLostAtIso) return 0;
  const lostAt = new Date(lastHeartLostAtIso);
  const regenMs = HEART_REGEN_MINUTES * 60 * 1000;
  const elapsedMs = now.getTime() - lostAt.getTime();
  const remainingMs = regenMs - (elapsedMs % regenMs);
  return Math.max(0, Math.ceil(remainingMs / 60000));
}

module.exports = { minutesUntilNextHeart, HEART_REGEN_MINUTES };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd faqih-frontend && node --test src/logic/heartsCountdown.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add faqih-frontend/src/logic/heartsCountdown.js faqih-frontend/src/logic/heartsCountdown.test.js
git commit -m "feat(frontend): add pure heart-regen countdown logic"
```

---

### Task 8: `useProgress()` hook

**Files:**
- Create: `faqih-frontend/src/logic/useProgress.js`

**Interfaces:**
- Consumes: `getDeviceId`, `getProgress`, `postAnswer`, `postCompleteLesson`, `postRefillHearts`, `DEFAULT_PROGRESS` (Task 6).
- Produces: `useProgress()` → `{ progress, loading, refresh(): Promise<void>, reportAnswer(correct: boolean): Promise<Progress|null>, completeLesson(lessonId: number): Promise<Progress|null>, refillHearts(): Promise<{ok, progress?, detail?}> }`. `progress` defaults to `DEFAULT_PROGRESS` while `loading` is true.

- [ ] **Step 1: Implement**

Create `faqih-frontend/src/logic/useProgress.js`:

```js
// src/logic/useProgress.js — shared hearts/gems/xp progress state.
// Thin React wrapper around the pure API functions in ../API; both
// HomeScreen (to render pills/path) and LessonScreen (to spend hearts,
// earn gems) read/write through this single hook so they never drift.

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getDeviceId, getProgress, postAnswer, postCompleteLesson, postRefillHearts,
  DEFAULT_PROGRESS,
} from '../API';

export function useProgress() {
  const [progress, setProgress] = useState(DEFAULT_PROGRESS);
  const [loading, setLoading] = useState(true);
  const deviceIdRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    const id = deviceIdRef.current ?? await getDeviceId();
    deviceIdRef.current = id;
    const data = await getProgress(id);
    setProgress(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const reportAnswer = useCallback(async (correct) => {
    const id = deviceIdRef.current ?? await getDeviceId();
    const updated = await postAnswer(id, correct);
    if (updated) setProgress(updated);
    return updated;
  }, []);

  const completeLesson = useCallback(async (lessonId) => {
    const id = deviceIdRef.current ?? await getDeviceId();
    const updated = await postCompleteLesson(id, lessonId);
    if (updated) setProgress(updated);
    return updated;
  }, []);

  const refillHearts = useCallback(async () => {
    const id = deviceIdRef.current ?? await getDeviceId();
    const result = await postRefillHearts(id);
    if (result.ok) setProgress(result.progress);
    return result;
  }, []);

  return { progress, loading, refresh: load, reportAnswer, completeLesson, refillHearts };
}
```

- [ ] **Step 2: Manually verify**

In the Expo web preview, temporarily add `console.log(useProgress())` inside `HomeScreen` (revert after checking), reload, and confirm the console shows `DEFAULT_PROGRESS` briefly then the real fetched values (against a locally running backend as in Task 6 Step 3).

- [ ] **Step 3: Commit**

```bash
git add faqih-frontend/src/logic/useProgress.js
git commit -m "feat(frontend): add useProgress hook wrapping the progress API"
```

---

### Task 9: Theme color update

**Files:**
- Modify: `faqih-frontend/src/theme.js`

**Interfaces:**
- No new interface — same exported `colors`/`fonts`/`radius`/`shadow`/`spacing` shape, only color values change.

- [ ] **Step 1: Update the primary green**

In `faqih-frontend/src/theme.js`, change:

```js
  // Primary — green
  primary:        '#43A047',
  primaryLight:   '#66BB6A',
  primaryDark:    '#1B5E20',
  primaryPale:    '#E8F5E9',
```

to:

```js
  // Primary — green (brighter, matches the FiqhQuest-style reference)
  primary:        '#58CC02',
  primaryLight:   '#7FE030',
  primaryDark:    '#3C8C00',
  primaryPale:    '#EAF9DC',
```

- [ ] **Step 2: Manually verify**

Open the Expo web preview, reload, confirm the Home header, buttons, and progress bars now render in the brighter green with no contrast regressions (white text on `primaryDark` header, correct-state green on option buttons still legible).

- [ ] **Step 3: Commit**

```bash
git add faqih-frontend/src/theme.js
git commit -m "feat(frontend): brighten primary green to match FiqhQuest-style reference"
```

---

### Task 10: `SkillPath` component (circular nodes + connector)

**Files:**
- Modify: `faqih-frontend/package.json` (via `npx expo install react-native-svg`)
- Create: `faqih-frontend/src/components/SkillPath.js`

**Interfaces:**
- Produces: `<SkillPath nodes={[{id, title, state}]} onPressNode={(id) => void} />` where `state` is `'done' | 'next' | 'locked'`. Renders a winding SVG connector line behind circular node buttons with a floating title pill beside each.

- [ ] **Step 1: Install `react-native-svg`**

Run: `cd faqih-frontend && npx expo install react-native-svg`

- [ ] **Step 2: Implement**

Create `faqih-frontend/src/components/SkillPath.js`:

```js
// src/components/SkillPath.js — winding circular lesson path (FiqhQuest-style).
// Pure presentation: state ('done'|'next'|'locked') and unlock rules are
// computed by the caller (HomeScreen), this only draws the path.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, radius, shadow, fonts } from '../theme';

const NODE_SIZE = 64;
const ROW_HEIGHT = 96;
const AMPLITUDE = 70; // how far nodes swing left/right of center

function xForRow(i) {
  return Math.sin(i * 1.1) * AMPLITUDE;
}

export function SkillPath({ nodes, onPressNode }) {
  const width = AMPLITUDE * 2 + NODE_SIZE + 40;
  const height = nodes.length * ROW_HEIGHT + NODE_SIZE;
  const centerX = width / 2;

  const points = nodes.map((_, i) => ({
    x: centerX + xForRow(i),
    y: i * ROW_HEIGHT + NODE_SIZE / 2,
  }));

  let d = '';
  points.forEach((p, i) => {
    if (i === 0) { d += `M ${p.x} ${p.y}`; return; }
    const prev = points[i - 1];
    const midY = (prev.y + p.y) / 2;
    d += ` C ${prev.x} ${midY}, ${p.x} ${midY}, ${p.x} ${p.y}`;
  });

  return (
    <View style={[styles.wrap, { width, height }]}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Path d={d} stroke={colors.neutral} strokeWidth={6} fill="none" strokeLinecap="round" />
      </Svg>
      {nodes.map((node, i) => {
        const p = points[i];
        const isRight = xForRow(i) >= 0;
        return (
          <View key={node.id} style={{ position: 'absolute', left: p.x - NODE_SIZE / 2, top: p.y - NODE_SIZE / 2 }}>
            <TouchableOpacity
              disabled={node.state === 'locked'}
              onPress={() => onPressNode(node.id)}
              activeOpacity={0.85}
              style={[
                styles.node,
                node.state === 'done' && styles.nodeDone,
                node.state === 'next' && styles.nodeNext,
                node.state === 'locked' && styles.nodeLocked,
              ]}
            >
              <Text style={styles.nodeIcon}>
                {node.state === 'done' ? '✓' : node.state === 'locked' ? '🔒' : '💧'}
              </Text>
            </TouchableOpacity>
            <View style={[styles.labelPill, isRight ? styles.labelRight : styles.labelLeft]}>
              <Text style={styles.labelText} numberOfLines={2}>{node.title}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'center' },
  node: {
    width: NODE_SIZE, height: NODE_SIZE, borderRadius: NODE_SIZE / 2,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.neutral, ...shadow.sm,
  },
  nodeDone:   { backgroundColor: colors.primaryDark },
  nodeNext:   { backgroundColor: colors.primary, borderWidth: 3, borderColor: colors.primaryPale, ...shadow.md },
  nodeLocked: { backgroundColor: colors.neutral, opacity: 0.7 },
  nodeIcon:   { fontSize: 24, color: colors.white },
  labelPill: {
    position: 'absolute', top: NODE_SIZE / 2 - 12, width: 130,
    backgroundColor: colors.card, borderRadius: radius.full,
    paddingVertical: 6, paddingHorizontal: 12, ...shadow.sm,
  },
  labelLeft:  { left: NODE_SIZE + 8 },
  labelRight: { right: NODE_SIZE + 8 },
  labelText:  { fontSize: 12, fontFamily: fonts.semibold, color: colors.text, textAlign: 'center' },
});
```

- [ ] **Step 3: Manually verify**

Temporarily render `<SkillPath nodes={[{id:1,title:'A',state:'done'},{id:2,title:'B',state:'next'},{id:3,title:'C',state:'locked'}]} onPressNode={console.log} />` in place of `HomeScreen`'s body (revert after checking) in the Expo web preview; confirm a winding line connects three alternating-side circular nodes with correct colors/icons per state, and that tapping the "next" node logs its id while the locked node is untappable.

- [ ] **Step 4: Commit**

```bash
git add faqih-frontend/package.json faqih-frontend/package-lock.json faqih-frontend/src/components/SkillPath.js
git commit -m "feat(frontend): add SkillPath circular node/connector component"
```

---

### Task 11: `HomeScreen` redesign

**Files:**
- Modify: `faqih-frontend/src/screens/HomeScreen.js`

**Interfaces:**
- Consumes: `useProgress()` (Task 8), `SkillPath` (Task 10), existing `getCategories`/`getUnit` (unchanged).
- Produces: same navigation contract as before — `navigation.navigate('Lesson', { lessonId, lessonTitle })`.

- [ ] **Step 1: Add the i18n keys this redesign needs**

New copy in this pass (unit banner prefix, bottom-tab labels, placeholder screens, out-of-hearts card) must go through the existing `t.*` system like every other string in the app — not be hardcoded, which would silently break the app's working English/Arabic language switch for just these new bits.

Add to `faqih-frontend/src/i18n/tr.js` (inside the existing `home: { ... }` object, alongside `lessonsUnit`):

```js
    unitPrefix:     'ÜNİTE',
    heartsOutTitle: 'Canların bitti 💔',
    heartsOutMessage: (mins) => `Bir sonraki can ${mins} dakika içinde yenilenecek.`,
    refillWithGems: (cost) => `💎 ${cost} Elmasla Yenile`,
```

and as new top-level keys (alongside `home`, `quiz`, `results`, etc.):

```js
  nav: {
    home:    'Ana Sayfa',
    courses: 'Kurslar',
    quests:  'Görevler',
  },

  comingSoon: {
    title:   'Yakında',
    courses: 'Kurslar bölümü hazırlanıyor.',
    quests:  'Görevler bölümü hazırlanıyor.',
  },
```

Add the matching keys to `faqih-frontend/src/i18n/en.js`:

```js
    unitPrefix:     'UNIT',
    heartsOutTitle: 'Out of hearts 💔',
    heartsOutMessage: (mins) => `Next heart in ${mins} min.`,
    refillWithGems: (cost) => `💎 Refill for ${cost}`,
```

```js
  nav: {
    home:    'Home',
    courses: 'Courses',
    quests:  'Quests',
  },

  comingSoon: {
    title:   'Coming soon',
    courses: 'Courses is being built.',
    quests:  'Quests is being built.',
  },
```

And to `faqih-frontend/src/i18n/ar.js`:

```js
    unitPrefix:     'الوحدة',
    heartsOutTitle: 'نفدت قلوبك 💔',
    heartsOutMessage: (mins) => `سيتجدد القلب التالي خلال ${mins} دقيقة.`,
    refillWithGems: (cost) => `💎 إعادة تعبئة مقابل ${cost}`,
```

```js
  nav: {
    home:    'الرئيسية',
    courses: 'الدورات',
    quests:  'المهام',
  },

  comingSoon: {
    title:   'قريباً',
    courses: 'قسم الدورات قيد الإعداد.',
    quests:  'قسم المهام قيد الإعداد.',
  },
```

- [ ] **Step 2: Replace the hardcoded `USER` header with progress pills + a per-unit banner + `SkillPath`**

In `faqih-frontend/src/screens/HomeScreen.js`:
- Remove the `const USER = { ... }` constant.
- Add `import { useProgress } from '../logic/useProgress';` and `import { SkillPath } from '../components/SkillPath';`.
- Inside the component, add `const { progress } = useProgress();`.
- Replace the `statsRow` block (streak badge + XP bar) with three pills reading `progress.streak`, `progress.gems`, `progress.hearts`:

```jsx
<View style={[styles.pillsRow, { flexDirection }]}>
  <View style={styles.pill}><Text style={styles.pillText}>🔥 {progress.streak}</Text></View>
  <View style={styles.pill}><Text style={styles.pillText}>💎 {progress.gems}</Text></View>
  <View style={styles.pill}><Text style={styles.pillText}>❤️ {progress.hearts}</Text></View>
</View>
```

- Add matching styles:

```js
  pillsRow: { gap: 8 },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: radius.full,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  pillText: { color: colors.white, fontSize: 13, fontFamily: fonts.semibold },
```

- Replace `lessonNodeState`'s hardcoded `USER.completedLessons` reference with `progress.completed_lesson_ids`:

```js
  const lessonNodeState = (lesson) => {
    const globalIndex = allLessonsInOrder.findIndex(l => l.id === lesson.id);
    if (progress.completed_lesson_ids.includes(lesson.id)) return 'done';
    if (globalIndex <= 0) return 'next';
    const previous = allLessonsInOrder[globalIndex - 1];
    return progress.completed_lesson_ids.includes(previous.id) ? 'next' : 'locked';
  };
```

- Replace the per-unit `<View style={styles.path}>...</View>` block (the `lessons.map` of card-style `TouchableOpacity` nodes) with:

```jsx
<SkillPath
  nodes={lessons.map(lesson => ({ id: lesson.id, title: lesson.title, state: lessonNodeState(lesson) }))}
  onPressNode={(lessonId) => {
    const lesson = lessons.find(l => l.id === lessonId);
    if (lesson) startLesson(lesson);
  }}
/>
```

- Remove the now-unused `node`/`nodeDone`/`nodeLocked`/`nodeIcon`/`nodeTitle`/`nodeTitleLocked`/`path`/`checkpoint`/`checkpointText` styles from the `StyleSheet.create` block, and the `PatternDots`/`XPBar` imports if no longer used elsewhere in the file.

- [ ] **Step 3: Replace the flat `categoryHeader` bar with a green unit banner + continue button**

Each unit currently renders under a flat `categoryHeader` colored bar (from `getCategoryStyle`) followed by a plain `unitLabel` text row. Replace the `unitLabel` line and the wrapping structure so each unit gets its own rounded green banner card, matching the mockup's "UNIT 1 — Introduction to Taharah" treatment, with a button that jumps straight to that unit's first not-yet-completed lesson:

```jsx
<View key={unit.id} style={styles.unitBlock}>
  <View style={styles.unitBanner}>
    <Text style={styles.unitBannerEyebrow}>
      {t.home.unitPrefix} {String(unit.id)}
    </Text>
    <Text style={[styles.unitBannerTitle, isRTL && styles.rtlText]}>{unit.title}</Text>
    <TouchableOpacity
      style={styles.unitBannerBtn}
      onPress={() => {
        const target = lessons.find(l => lessonNodeState(l) !== 'locked' && !progress.completed_lesson_ids.includes(l.id))
          ?? lessons[0];
        if (target) startLesson(target);
      }}
    >
      <Text style={styles.unitBannerBtnText}>{t.quiz.continue}</Text>
    </TouchableOpacity>
  </View>
  <SkillPath
    nodes={lessons.map(lesson => ({ id: lesson.id, title: lesson.title, state: lessonNodeState(lesson) }))}
    onPressNode={(lessonId) => {
      const lesson = lessons.find(l => l.id === lessonId);
      if (lesson) startLesson(lesson);
    }}
  />
</View>
```

(This replaces both the old `<Text style={styles.unitLabel}>{unit.title}</Text>` line and the `<View style={styles.path}>` block from the previous step — they become the single block above. The outer per-category `categoryHeader`/`categoryIcon`/`categoryTitle` bar above the unit loop stays as-is; it groups units under a category, while the new banner is per-unit.)

Add matching styles, replacing the old `unitLabel` style:

```js
  unitBanner: {
    backgroundColor: colors.primary, borderRadius: radius.xl,
    padding: spacing.md, marginBottom: spacing.md, ...shadow.md,
  },
  unitBannerEyebrow: { fontSize: 11, fontFamily: fonts.semibold, color: 'rgba(255,255,255,0.75)', letterSpacing: 1, marginBottom: 2 },
  unitBannerTitle:   { fontSize: 18, fontFamily: fonts.heading, color: colors.white, marginBottom: 12 },
  unitBannerBtn:     { backgroundColor: colors.white, borderRadius: radius.full, paddingVertical: 10, alignItems: 'center' },
  unitBannerBtnText: { fontSize: 14, fontFamily: fonts.semibold, color: colors.primaryDark },
```

- [ ] **Step 4: Manually verify**

Run the backend locally (as in Task 6) and the Expo web preview; confirm Home shows the three pills with real numbers from `GET /api/progress/...`, each unit now shows a green banner with its title and a working "Devam Et" button that opens the right lesson, and the skill path below it renders as circular nodes with the winding connector and correct done/next/locked states.

- [ ] **Step 5: Commit**

```bash
git add faqih-frontend/src/screens/HomeScreen.js faqih-frontend/src/i18n/tr.js faqih-frontend/src/i18n/en.js faqih-frontend/src/i18n/ar.js
git commit -m "feat(frontend): redesign HomeScreen with progress pills, unit banner, and SkillPath"
```

---

### Task 12: `LessonScreen` hearts wiring

**Files:**
- Modify: `faqih-frontend/src/screens/LessonScreen.js`

**Interfaces:**
- Consumes: `useProgress()` (Task 8), `minutesUntilNextHeart` (Task 7).
- Produces: no new exported interface — internal behavior change (wrong answers spend a heart, 0 hearts blocks with a refill/countdown card, lesson completion awards gems).

- [ ] **Step 1: Wire hearts into `settle()` and add a `STATE.NO_HEARTS`**

In `faqih-frontend/src/screens/LessonScreen.js`:
- Add `import { useProgress } from '../logic/useProgress';` and `import { minutesUntilNextHeart } from '../logic/heartsCountdown';`.
- Add `NO_HEARTS: 'no_hearts'` to the `STATE` object.
- Inside the component, add `const { progress, reportAnswer, completeLesson, refillHearts } = useProgress();`.
- Modify `settle` to report wrong answers and check the result:

```js
  const settle = async (isCorrect, chosenLabel) => {
    setResultCorrect(isCorrect);
    if (!isCorrect) {
      setMistakes(m => [...m, { question, chosen: chosenLabel }]);
      shake();
      const updated = await reportAnswer(false);
      if (updated && updated.hearts === 0) {
        setState(STATE.NO_HEARTS);
        return;
      }
    }
    setState(STATE.FEEDBACK);
    Animated.timing(feedbackAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  };
```

- [ ] **Step 2: Award gems when a lesson finishes**

In `advance()`, after `setSession(nextSession);`, add:

```js
    if (nextSession.finished) {
      completeLesson(lessonId);
    }
```

(`lessonId` is already destructured from `route.params` at the top of the component.)

- [ ] **Step 3: Render the "out of hearts" card**

Add a new branch right after the `if (state === STATE.RESULTS)` block and before the `// Question` return:

```jsx
  // Out of hearts
  if (state === STATE.NO_HEARTS) {
    // 50 mirrors HEART_REFILL_COST in faqih_backend/content/models.py.
    const HEART_REFILL_COST = 50;
    const mins = minutesUntilNextHeart(progress.last_heart_lost_at);
    const canRefill = progress.gems >= HEART_REFILL_COST;
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" />
        <ScrollView contentContainerStyle={styles.introScroll}>
          <View style={styles.introCard}>
            <Text style={styles.introTitle}>{t.home.heartsOutTitle}</Text>
            <Text style={styles.introText}>{t.home.heartsOutMessage(mins)}</Text>
          </View>
          {canRefill && (
            <PrimaryButton
              title={t.home.refillWithGems(HEART_REFILL_COST)}
              onPress={async () => {
                const result = await refillHearts();
                if (result.ok) { setState(STATE.QUESTION); animateCardIn(); }
              }}
            />
          )}
          <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.homeBtn}>
            <Text style={styles.homeBtnText}>{t.results.home}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }
```

(Reuses the existing `introCard`/`introTitle`/`introText`/`homeBtn`/`homeBtnText` styles already defined later in the file, and the existing `t.results.home` copy — no new styles needed. `t` is already destructured from `useLang()` earlier in the component.)

- [ ] **Step 4: Manually verify**

With the backend running locally (Task 6), in the Expo web preview: open a lesson, answer wrong 3 times in a row (across questions/retries as needed) to drain hearts to 0, confirm the "Canların bitti 💔" card appears with a ~30-minute countdown; if gems ≥ 50 confirm the refill button restores hearts and resumes the lesson; complete a lesson normally and confirm `GET /api/progress/<id>/` (checked via the browser network tab) shows `gems` incremented by 10 and the lesson id added to `completed_lesson_ids`.

- [ ] **Step 5: Commit**

```bash
git add faqih-frontend/src/screens/LessonScreen.js
git commit -m "feat(frontend): wire hearts/gems into LessonScreen answer and completion flow"
```

---

### Task 13: Bottom tab bar + Courses/Quests placeholders

**Files:**
- Modify: `faqih-frontend/package.json` (via `npx expo install @react-navigation/bottom-tabs`)
- Create: `faqih-frontend/src/screens/CoursesScreen.js`
- Create: `faqih-frontend/src/screens/QuestsScreen.js`
- Modify: `faqih-frontend/App.js`

**Interfaces:**
- Produces: 4-tab bottom navigation (Home / Courses / Quests / Profile); `CoursesScreen`, `QuestsScreen` as standalone screen components matching the existing screen file shape (default export, `SafeAreaView` root).

- [ ] **Step 1: Install `@react-navigation/bottom-tabs`**

Run: `cd faqih-frontend && npx expo install @react-navigation/bottom-tabs`

- [ ] **Step 2: Create the placeholder screens**

Create `faqih-frontend/src/screens/CoursesScreen.js`:

```js
// src/screens/CoursesScreen.js — placeholder; real content is future work.

import React from 'react';
import { View, Text, SafeAreaView, StyleSheet } from 'react-native';
import { colors, fonts, spacing } from '../theme';
import { useLang } from '../i18n';

export default function CoursesScreen() {
  const { t } = useLang();
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <Text style={styles.icon}>📚</Text>
        <Text style={styles.title}>{t.comingSoon.title}</Text>
        <Text style={styles.body}>{t.comingSoon.courses}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  icon:   { fontSize: 40, marginBottom: 12 },
  title:  { fontSize: 20, fontFamily: fonts.heading, color: colors.text, marginBottom: 6 },
  body:   { fontSize: 14, fontFamily: fonts.medium, color: colors.textMuted, textAlign: 'center' },
});
```

Create `faqih-frontend/src/screens/QuestsScreen.js` (identical shape, different copy key):

```js
// src/screens/QuestsScreen.js — placeholder; real Daily Goal content is future work.

import React from 'react';
import { View, Text, SafeAreaView, StyleSheet } from 'react-native';
import { colors, fonts, spacing } from '../theme';
import { useLang } from '../i18n';

export default function QuestsScreen() {
  const { t } = useLang();
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <Text style={styles.icon}>🎯</Text>
        <Text style={styles.title}>{t.comingSoon.title}</Text>
        <Text style={styles.body}>{t.comingSoon.quests}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  icon:   { fontSize: 40, marginBottom: 12 },
  title:  { fontSize: 20, fontFamily: fonts.heading, color: colors.text, marginBottom: 6 },
  body:   { fontSize: 14, fontFamily: fonts.medium, color: colors.textMuted, textAlign: 'center' },
});
```

- [ ] **Step 3: Add the bottom tab navigator**

Modify `faqih-frontend/App.js`:

```js
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import CoursesScreen from './src/screens/CoursesScreen';
import QuestsScreen   from './src/screens/QuestsScreen';
```

Replace the body of `AppNavigator` so `Home`/`Lesson` stay in a stack (Lesson must stay reachable without its own tab bar) nested under the Home tab, and `Courses`/`Quests`/`Profile` become sibling tabs:

```jsx
const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="Lesson"   component={LessonScreen} />
    </Stack.Navigator>
  );
}

function AppNavigator() {
  const { t } = useLang();
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
        }}
      >
        <Tab.Screen name="Home"    component={HomeStack}    options={{ tabBarLabel: t.nav.home,    tabBarIcon: () => <Text>🏠</Text> }} />
        <Tab.Screen name="Courses" component={CoursesScreen} options={{ tabBarLabel: t.nav.courses, tabBarIcon: () => <Text>📚</Text> }} />
        <Tab.Screen name="Quests"  component={QuestsScreen}  options={{ tabBarLabel: t.nav.quests,  tabBarIcon: () => <Text>🎯</Text> }} />
        <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: t.profile.title, tabBarIcon: () => <Text>👤</Text> }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
```

Add `import { Text } from 'react-native';` to the top-of-file RN import (alongside the existing `View` import) for the inline tab icons.

Note: `HomeScreen`'s `navigation.navigate('Profile')` call (avatar button) and `navigation.navigate('Lesson', {...})` calls still work unchanged — `navigate` resolves screen names across the nested navigator tree the same way in React Navigation 7.

- [ ] **Step 4: Manually verify**

In the Expo web preview: confirm a 4-tab bar appears at the bottom (Ana Sayfa / Kurslar / Görevler / Profilim), each labeled tab switches screens, Courses/Quests show their "Yakında" placeholder, tapping a lesson node from Home still opens `LessonScreen` full-screen (no tab bar showing over it), and the Home screen's avatar button still navigates to Profile.

- [ ] **Step 5: Commit**

```bash
git add faqih-frontend/package.json faqih-frontend/package-lock.json faqih-frontend/src/screens/CoursesScreen.js faqih-frontend/src/screens/QuestsScreen.js faqih-frontend/App.js
git commit -m "feat(frontend): add bottom tab bar with Courses/Quests placeholders"
```

---

## Known limitation (not addressed by this plan)

The Django backend's SQLite database is committed to the repo and reset on every Render redeploy (see project memory / `docs/superpowers/specs/2026-08-06-home-redesign-progress-system-design.md` context). Until the previously-agreed Postgres migration happens, `UserProgress` rows created against the deployed `faqih.onrender.com` backend will be lost on the next redeploy. This doesn't block building/testing this feature (verify locally per each task's manual-verification step), but flag it to the user before relying on hearts/gems persisting on the live deployed app.
