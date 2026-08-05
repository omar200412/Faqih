# Curriculum & Lesson Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure Faqih's content model from a flat `Category → Unit → Question` quiz list into `Category → Unit → Lesson → Exercise`, add two new exercise types (ordering, fill-in-the-blank), and rebuild the app's lesson session flow (intro screens, mistake-queue) and Home screen path map around it.

**Architecture:** Django backend evolves the existing single-table-with-`options_json` pattern by inserting a `Lesson` model between `Unit` and the renamed `Exercise` model; the Expo/React Native app gains a session-state engine (pure JS, no persistence yet) driving a rewritten lesson screen and a path-map Home screen. No accounts/persistence, gamification, or mascots in this phase — those are later sub-projects.

**Tech Stack:** Django 5.1 + Django REST Framework (backend, SQLite dev / Render prod), Expo / React Native 0.81 + React Navigation (frontend), Node's built-in `node:test` for the one piece of frontend logic worth unit testing.

## Global Constraints

- Keep the existing single-table `options_json` pattern for exercises — do not introduce per-type tables (spec: data model section).
- `correct_option` is renamed to `correct_answer` on the renamed `Exercise` model — this is the only field rename the spec calls for; do not rename `question_type` (out of scope, unnecessary churn).
- Lesson unlock logic stays a simple "is the previous lesson done" check — no branching prerequisite graph (spec: unlock logic section).
- No session persistence: exiting a lesson mid-way always restarts it clean (spec: lesson session flow section).
- No new npm/pip dependencies for drag-and-drop or animation libraries — ordering and fill-blank exercises use the same tap-based interaction style already used for matching (no drag library exists in the repo today).
- All existing exercise types (mcq, true_false, matching, image, video) and the legacy `hotspot` type must keep working after the migration — this is a non-destructive restructuring, not a rewrite.
- Follow existing code style exactly: Turkish UI strings/comments in the Django panel and admin, the `colors`/`radius`/`shadow`/`spacing`/`fonts` tokens from `faqih-frontend/src/theme.js` for all new UI, and the existing `useLang()`/`useRTL()` i18n pattern for all new frontend copy.

---

## File Structure

**Backend (`faqih_backend/`)**
- `content/models.py` — modify: add `Lesson`, rename `Question` → `Exercise`, rename field `correct_option` → `correct_answer`, add `ordering`/`fill_blank` to the type choices.
- `content/migrations/0006_lesson.py`, `0007_migrate_questions_to_lessons.py`, `0008_finalize_lesson_model.py` — create.
- `content/admin.py` — modify: `LessonInline`/`ExerciseInline`, new `LessonAdmin`, renamed `ExerciseAdmin`.
- `content/serializers.py` — modify: `ExerciseSerializer` (renamed), new `LessonSerializer`/`LessonSummarySerializer`, updated `UnitSerializer`/`UnitSummarySerializer`.
- `content/views.py` — modify: new `LessonViewSet`, renamed `ExerciseViewSet`, new `lesson_intro_image` view.
- `content/urls.py` — modify: register the lessons router, add the intro-image path.
- `content/tests.py` — modify: serializer/API tests for the new nesting and new exercise types.
- `panel/views.py` — modify: Lesson CRUD views, exercises re-scoped to lessons, ordering/fill_blank form handling.
- `panel/urls.py` — modify: new lesson routes.
- `panel/templates/panel/unit.html` — modify: now lists lessons, not exercises.
- `panel/templates/panel/lesson.html` — create: lists a lesson's exercises (what `unit.html` used to do).
- `panel/templates/panel/lesson_form.html` — create: create/edit a lesson's title + intro content.
- `panel/templates/panel/type_picker.html` — modify: two new type cards.
- `panel/templates/panel/question_form.html` — modify: ordering/fill_blank form fields + live preview.
- `panel/templates/panel/base.html` — modify: sidebar lesson count, new CSS variables for the two new type chips.

**Frontend (`faqih-frontend/`)**
- `src/API.js` — modify: `getUnit` now returns lesson summaries, new `getLesson(id)`.
- `src/logic/lessonSession.js` — create: pure mistake-queue engine (no RN imports, unit-testable).
- `src/logic/lessonSession.test.js` — create.
- `src/components/ExerciseTypes.js` — create: `OrderingExercise`, `FillBlankExercise` components.
- `src/screens/LessonScreen.js` — create: replaces `QuizScreen.js` (deleted at the end of Task 13).
- `src/screens/HomeScreen.js` — modify: path-map rendering of lessons instead of a flat unit list.
- `src/i18n/tr.js`, `src/i18n/en.js`, `src/i18n/ar.js` — modify: new keys for intro screens, new exercise types, path map.
- `App.js` — modify: `Quiz` route → `Lesson` route.
- `package.json` — modify: add a `test` script for `node --test`.

---

### Task 1: Add the `Lesson` model and a nullable link from `Question`

**Files:**
- Modify: `faqih_backend/content/models.py`
- Create: `faqih_backend/content/migrations/0006_lesson.py`
- Test: `faqih_backend/content/tests.py`

**Interfaces:**
- Produces: `Lesson` model with fields `unit` (FK), `title`, `intro_kind` (`'none'|'text'|'image'|'video'`), `intro_text`, `intro_video_url`, `intro_image_data`, `intro_image_mime`. `Question.lesson` FK (nullable for now — Task 2 backfills it, Task 3 makes it required).

- [ ] **Step 1: Write the failing test**

Add to `faqih_backend/content/tests.py`:

```python
from django.test import TestCase
from .models import Category, Unit, Lesson, Question


class LessonModelTests(TestCase):
    def test_lesson_belongs_to_unit_and_defaults_to_no_intro(self):
        category = Category.objects.create(title='Namaz')
        unit = Unit.objects.create(category=category, title='Namaz Vakitleri')
        lesson = Lesson.objects.create(unit=unit, title='Vakitlerin Girişi')

        self.assertEqual(lesson.unit, unit)
        self.assertEqual(lesson.intro_kind, 'none')
        self.assertIn(lesson, unit.lessons.all())
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd faqih_backend && python manage.py test content.LessonModelTests -v 2`
Expected: FAIL — `ImportError: cannot import name 'Lesson' from 'content.models'`

- [ ] **Step 3: Add the `Lesson` model and nullable `Question.lesson` field**

In `faqih_backend/content/models.py`, insert after the `Unit` class (after line 31, before `QUESTION_TYPES`):

```python
LESSON_INTRO_KINDS = [
    ('none',  'Yok'),
    ('text',  'Metin'),
    ('image', 'Görsel'),
    ('video', 'Video'),
]


class Lesson(models.Model):
    unit             = models.ForeignKey(
        Unit, on_delete=models.CASCADE,
        related_name='lessons', verbose_name='Ünite'
    )
    title            = models.CharField(max_length=200, verbose_name='Ders Adı')
    intro_kind       = models.CharField(
        max_length=10, choices=LESSON_INTRO_KINDS,
        default='none', verbose_name='Giriş Türü'
    )
    intro_text       = models.TextField(blank=True, verbose_name='Giriş Metni')
    intro_video_url  = models.URLField(blank=True, verbose_name='Giriş Videosu')
    # Görsel girişler veritabanında saklanır (Render diski kalıcı değil) — Exercise.image_data ile aynı desen.
    intro_image_data = models.BinaryField(null=True, blank=True, editable=False)
    intro_image_mime = models.CharField(max_length=50, blank=True, default='')

    class Meta:
        verbose_name        = 'Ders'
        verbose_name_plural = 'Dersler'
        ordering            = ['id']

    def __str__(self):
        return f'{self.unit.title} → {self.title}'
```

Then add a nullable `lesson` field to `Question` — insert right after the `unit` field (currently line 44-47):

```python
class Question(models.Model):
    unit          = models.ForeignKey(
        Unit, on_delete=models.CASCADE,
        related_name='questions', verbose_name='Ünite'
    )
    lesson        = models.ForeignKey(
        Lesson, on_delete=models.CASCADE, null=True, blank=True,
        related_name='questions', verbose_name='Ders'
    )
    question_type = models.CharField(
        ...
```

(Only the two changes above — everything else in `models.py` stays as-is for this task.)

- [ ] **Step 4: Write the migration**

Create `faqih_backend/content/migrations/0006_lesson.py`:

```python
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0005_question_image'),
    ]

    operations = [
        migrations.CreateModel(
            name='Lesson',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200, verbose_name='Ders Adı')),
                ('intro_kind', models.CharField(choices=[('none', 'Yok'), ('text', 'Metin'), ('image', 'Görsel'), ('video', 'Video')], default='none', max_length=10, verbose_name='Giriş Türü')),
                ('intro_text', models.TextField(blank=True, verbose_name='Giriş Metni')),
                ('intro_video_url', models.URLField(blank=True, verbose_name='Giriş Videosu')),
                ('intro_image_data', models.BinaryField(blank=True, editable=False, null=True)),
                ('intro_image_mime', models.CharField(blank=True, default='', max_length=50)),
                ('unit', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='lessons', to='content.unit', verbose_name='Ünite')),
            ],
            options={
                'verbose_name': 'Ders',
                'verbose_name_plural': 'Dersler',
                'ordering': ['id'],
            },
        ),
        migrations.AddField(
            model_name='question',
            name='lesson',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='questions', to='content.lesson', verbose_name='Ders'),
        ),
    ]
```

- [ ] **Step 5: Run migration and test**

Run: `cd faqih_backend && python manage.py migrate content && python manage.py test content.LessonModelTests -v 2`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add faqih_backend/content/models.py faqih_backend/content/migrations/0006_lesson.py faqih_backend/content/tests.py
git commit -m "feat: add Lesson model between Unit and Question"
```

---

### Task 2: Backfill existing questions into a default Lesson per unit

**Files:**
- Create: `faqih_backend/content/migrations/0007_migrate_questions_to_lessons.py`
- Test: `faqih_backend/content/tests.py`

**Interfaces:**
- Consumes: `Lesson`, `Question.lesson` from Task 1.
- Produces: every existing `Question` has a non-null `lesson`, each pointing at a new `Lesson` (one per `Unit` that had questions) whose `title` equals the unit's title.

- [ ] **Step 1: Write the failing test**

Add to `faqih_backend/content/tests.py`:

```python
from django.test import TestCase
from django.db.migrations.executor import MigrationExecutor
from django.db import connection


class LessonBackfillMigrationTests(TestCase):
    def test_existing_questions_get_wrapped_in_a_default_lesson(self):
        executor = MigrationExecutor(connection)
        executor.migrate([('content', '0006_lesson')])

        old_apps = executor.loader.project_state(('content', '0006_lesson')).apps
        Category = old_apps.get_model('content', 'Category')
        Unit = old_apps.get_model('content', 'Unit')
        Question = old_apps.get_model('content', 'Question')

        category = Category.objects.create(title='Temizlik')
        unit = Unit.objects.create(category=category, title='Abdest')
        Question.objects.create(
            unit=unit, question_type='mcq', text='Kaç farz?',
            options_json='["2","4"]', correct_option='4',
        )

        executor = MigrationExecutor(connection)
        executor.migrate([('content', '0007_migrate_questions_to_lessons')])

        new_apps = executor.loader.project_state(('content', '0007_migrate_questions_to_lessons')).apps
        Question = new_apps.get_model('content', 'Question')
        Lesson = new_apps.get_model('content', 'Lesson')

        q = Question.objects.get(text='Kaç farz?')
        self.assertIsNotNone(q.lesson_id)
        self.assertEqual(Lesson.objects.get(pk=q.lesson_id).title, 'Abdest')

        # Re-migrate to head so the rest of the test suite runs on the final schema.
        executor = MigrationExecutor(connection)
        executor.migrate(executor.loader.graph.leaf_nodes())
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd faqih_backend && python manage.py test content.LessonBackfillMigrationTests -v 2`
Expected: FAIL — `django.db.migrations.exceptions.NodeNotFoundError` (migration `0007_migrate_questions_to_lessons` doesn't exist yet)

- [ ] **Step 3: Write the data migration**

Create `faqih_backend/content/migrations/0007_migrate_questions_to_lessons.py`:

```python
from django.db import migrations


def create_default_lessons(apps, schema_editor):
    Unit = apps.get_model('content', 'Unit')
    Lesson = apps.get_model('content', 'Lesson')
    for unit in Unit.objects.all():
        questions = list(unit.questions.all())
        if not questions:
            continue
        lesson = Lesson.objects.create(unit=unit, title=unit.title)
        for q in questions:
            q.lesson_id = lesson.id
            q.save(update_fields=['lesson'])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0006_lesson'),
    ]

    operations = [
        migrations.RunPython(create_default_lessons, noop_reverse),
    ]
```

- [ ] **Step 4: Run migration and test**

Run: `cd faqih_backend && python manage.py test content.LessonBackfillMigrationTests -v 2`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add faqih_backend/content/migrations/0007_migrate_questions_to_lessons.py faqih_backend/content/tests.py
git commit -m "feat: backfill existing questions into a default lesson per unit"
```

---

### Task 3: Finalize the schema — rename `Question`→`Exercise`, `correct_option`→`correct_answer`, add ordering/fill_blank

**Files:**
- Modify: `faqih_backend/content/models.py`
- Create: `faqih_backend/content/migrations/0008_finalize_lesson_model.py`
- Test: `faqih_backend/content/tests.py`

**Interfaces:**
- Consumes: backfilled `Question.lesson` from Task 2.
- Produces: `Exercise` model (renamed from `Question`) with required `lesson` FK (no more `unit` FK), `correct_answer` field (renamed from `correct_option`), and `EXERCISE_TYPES` including `ordering` and `fill_blank`. This is the model name every later task (serializers, views, admin, panel, tests) imports.

- [ ] **Step 1: Write the failing test**

Add to `faqih_backend/content/tests.py`:

```python
from .models import Exercise, EXERCISE_TYPES


class ExerciseModelTests(TestCase):
    def test_exercise_has_no_unit_field_and_supports_new_types(self):
        category = Category.objects.create(title='Namaz')
        unit = Unit.objects.create(category=category, title='Namaz Vakitleri')
        lesson = Lesson.objects.create(unit=unit, title='Abdest Adımları')

        exercise = Exercise.objects.create(
            lesson=lesson, question_type='ordering', text='Adımları sırala',
            options_json='{"steps": ["Niyet et", "Elleri yıka"]}',
            correct_answer='',
        )

        self.assertFalse(hasattr(Exercise, 'unit'))
        self.assertEqual(exercise.lesson, lesson)
        self.assertIn(('ordering', 'Sıralama'), EXERCISE_TYPES)
        self.assertIn(('fill_blank', 'Boşluk Doldurma'), EXERCISE_TYPES)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd faqih_backend && python manage.py test content.ExerciseModelTests -v 2`
Expected: FAIL — `ImportError: cannot import name 'Exercise' from 'content.models'`

- [ ] **Step 3: Fix the now-stale `Question` import from Task 1**

Task 1 added `from .models import Category, Unit, Lesson, Question` to the top of `faqih_backend/content/tests.py`. Once this task renames `Question` to `Exercise`, that name no longer exists, and this import line would raise `ImportError` and break every test in the file — not just the ones that need `Exercise`. Fix it now, before making the rename, by changing that line to:
```python
from .models import Category, Unit, Lesson
```
(`Question`/`Exercise` for the tests that need it is imported separately via `from .models import Exercise, EXERCISE_TYPES` in Step 1 above.)

- [ ] **Step 4: Rewrite the exercise portion of `models.py`**

Replace the `QUESTION_TYPES` constant and the `Question` class (current lines 34-69 of `faqih_backend/content/models.py`) with:

```python
EXERCISE_TYPES = [
    ('mcq',        'Çoktan Seçmeli'),
    ('true_false', 'Doğru / Yanlış'),
    ('matching',   'Eşleştirme'),
    ('image',      'Resimli Soru'),
    ('video',      'Video Ders'),
    ('ordering',   'Sıralama'),
    ('fill_blank', 'Boşluk Doldurma'),
    ('hotspot',    'Hotspot (Resim Üzeri)'),
]

class Exercise(models.Model):
    lesson        = models.ForeignKey(
        Lesson, on_delete=models.CASCADE,
        related_name='exercises', verbose_name='Ders'
    )
    question_type = models.CharField(
        max_length=20, choices=EXERCISE_TYPES,
        default='mcq', verbose_name='Soru Türü'
    )
    text          = models.TextField(verbose_name='Soru Metni')
    options_json  = models.TextField(
        verbose_name='Seçenekler (JSON)',
        help_text=(
            'MCQ: ["A", "B", "C", "D"]  |  Hotspot: {"background_image": "...", "hotspots": [...]}  |  '
            'Sıralama: {"steps": ["1. adım", "2. adım", ...]} (doğru sırada yazılır)  |  '
            'Boşluk Doldurma: {"sentence": "Abdestin ___ farzı vardır.", "word_bank": ["dört", "beş", "altı"]}'
        )
    )
    correct_answer = models.CharField(max_length=200, blank=True, verbose_name='Doğru Cevap')
    explanation    = models.TextField(blank=True, verbose_name='Açıklama')
    # Resimli sorular için görsel veritabanında saklanır (Render diski kalıcı değil)
    image_data     = models.BinaryField(null=True, blank=True, editable=False)
    image_mime     = models.CharField(max_length=50, blank=True, default='')

    class Meta:
        verbose_name        = 'Alıştırma'
        verbose_name_plural = 'Alıştırmalar'
        ordering            = ['id']

    def __str__(self):
        return f'[{self.lesson.title}] {self.text[:50]}'
```

(`Category`, `Unit`, `Lesson` above it are unchanged.)

- [ ] **Step 5: Write the migration**

Create `faqih_backend/content/migrations/0008_finalize_lesson_model.py`:

```python
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0007_migrate_questions_to_lessons'),
    ]

    operations = [
        migrations.AlterField(
            model_name='question',
            name='lesson',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='questions', to='content.lesson', verbose_name='Ders'),
        ),
        migrations.RemoveField(model_name='question', name='unit'),
        migrations.RenameModel(old_name='Question', new_name='Exercise'),
        migrations.RenameField(model_name='exercise', old_name='correct_option', new_name='correct_answer'),
        migrations.AlterField(
            model_name='exercise',
            name='correct_answer',
            field=models.CharField(blank=True, max_length=200, verbose_name='Doğru Cevap'),
        ),
        migrations.AlterField(
            model_name='exercise',
            name='question_type',
            field=models.CharField(
                choices=[
                    ('mcq', 'Çoktan Seçmeli'),
                    ('true_false', 'Doğru / Yanlış'),
                    ('matching', 'Eşleştirme'),
                    ('image', 'Resimli Soru'),
                    ('video', 'Video Ders'),
                    ('ordering', 'Sıralama'),
                    ('fill_blank', 'Boşluk Doldurma'),
                    ('hotspot', 'Hotspot (Resim Üzeri)'),
                ],
                default='mcq', max_length=20, verbose_name='Soru Türü',
            ),
        ),
        migrations.AlterModelOptions(
            name='exercise',
            options={'ordering': ['id'], 'verbose_name': 'Alıştırma', 'verbose_name_plural': 'Alıştırmalar'},
        ),
    ]
```

- [ ] **Step 6: Run migration and full model test file**

Run: `cd faqih_backend && python manage.py migrate content && python manage.py test content -v 2`
Expected: PASS (all tests from Tasks 1-3)

- [ ] **Step 7: Commit**

```bash
git add faqih_backend/content/models.py faqih_backend/content/migrations/0008_finalize_lesson_model.py faqih_backend/content/tests.py
git commit -m "feat: rename Question to Exercise, correct_option to correct_answer, add ordering/fill_blank types"
```

---

### Task 4: Update Django admin for the Lesson layer

**Files:**
- Modify: `faqih_backend/content/admin.py`

**Interfaces:**
- Consumes: `Lesson`, `Exercise` from Task 3.

- [ ] **Step 1: Rewrite `admin.py`**

Replace the full contents of `faqih_backend/content/admin.py`:

```python
from django.contrib import admin
from django.utils.html import format_html
from .models import Category, Unit, Lesson, Exercise
import json

# ── Inline Tanımlamaları ────────────────────────────────
class ExerciseInline(admin.StackedInline):
    model = Exercise
    extra = 1
    fields = ('question_type', 'text', 'options_json', 'correct_answer', 'explanation')
    show_change_link = True

class LessonInline(admin.TabularInline):
    model = Lesson
    extra = 1
    fields = ('title', 'intro_kind')
    show_change_link = True

class UnitInline(admin.TabularInline):
    model = Unit
    extra = 1
    fields = ('title',)
    show_change_link = True

# ── Admin Sınıfları ────────────────────────────────────────────
@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'unit_count')
    search_fields = ('title',)
    inlines = [UnitInline]

    def unit_count(self, obj):
        return obj.units.count()
    unit_count.short_description = 'Ünite Sayısı'

@admin.register(Unit)
class UnitAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'category', 'lesson_count')
    list_filter = ('category',)
    search_fields = ('title',)
    inlines = [LessonInline]

    def lesson_count(self, obj):
        return obj.lessons.count()
    lesson_count.short_description = 'Ders Sayısı'

@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'unit', 'intro_kind', 'exercise_count')
    list_filter = ('unit__category', 'intro_kind')
    search_fields = ('title',)
    inlines = [ExerciseInline]

    def exercise_count(self, obj):
        return obj.exercises.count()
    exercise_count.short_description = 'Alıştırma Sayısı'

EXERCISE_TYPE_LABELS = {
    'mcq': '❓ Çoktan Seçmeli',
    'ordering': '🔢 Sıralama',
    'fill_blank': '✏️ Boşluk Doldurma',
    'hotspot': '🗺️ Hotspot',
}

@admin.register(Exercise)
class ExerciseAdmin(admin.ModelAdmin):
    list_display = ('id', 'short_text', 'question_type_badge', 'lesson', 'correct_answer')
    list_filter = ('question_type', 'lesson__unit__category')
    search_fields = ('text',)
    readonly_fields = ('options_preview',)

    fieldsets = (
        ('Soru', {
            'fields': ('lesson', 'question_type', 'text')
        }),
        ('Cevaplar', {
            'fields': ('options_json', 'options_preview', 'correct_answer'),
            'description': (
                'MCQ için options_json şöyle olmalı: ["Seçenek A", "Seçenek B", "Seçenek C", "Seçenek D"]\n'
                'Hotspot için: {"background_image": "URL", "hotspots": [{"id": "A", "text": "...", "style": {}}]}\n'
                'Sıralama için: {"steps": ["1. adım", "2. adım", ...]} (doğru sırada)\n'
                'Boşluk Doldurma için: {"sentence": "... ___ ...", "word_bank": ["kelime1", "kelime2"]}'
            ),
        }),
        ('Açıklama', {
            'fields': ('explanation',),
        }),
    )

    def short_text(self, obj):
        if obj.text:
            return obj.text[:60] + '...' if len(obj.text) > 60 else obj.text
        return "-"
    short_text.short_description = 'Soru'

    def question_type_badge(self, obj):
        label = EXERCISE_TYPE_LABELS.get(obj.question_type, obj.question_type)
        colors = {'mcq': '#1A5C38', 'ordering': '#8A6620', 'fill_blank': '#2C5F8A', 'hotspot': '#C9993A'}
        color = colors.get(obj.question_type, '#555')
        return format_html(
            '<span style="background:{};color:#fff;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:700">{}</span>',
            color, label
        )
    question_type_badge.short_description = 'Tür'

    def options_preview(self, obj):
        if not obj.options_json:
            return '—'
        try:
            data = json.loads(obj.options_json)
            if isinstance(data, list):
                items = ''.join(f'<li style="padding:4px 0"><b>{chr(65+i)})</b> {opt}</li>' for i, opt in enumerate(data))
                return format_html('<ul style="margin:0;padding-left:16px">{}</ul>', items)
            elif isinstance(data, dict) and 'hotspots' in data:
                hotspots = data['hotspots']
                items = ''.join(f'<li><b>{h.get("id", "")}</b> — {h.get("text", "")}</li>' for h in hotspots)
                return format_html(
                    '<p>🖼️ <a href="{}" target="_blank">Resmi Görüntüle</a></p><ul>{}</ul>',
                    data.get('background_image', '#'), items
                )
            elif isinstance(data, dict) and 'steps' in data:
                items = ''.join(f'<li style="padding:4px 0">{i+1}. {s}</li>' for i, s in enumerate(data['steps']))
                return format_html('<ol style="margin:0;padding-left:16px">{}</ol>', items)
            elif isinstance(data, dict) and 'sentence' in data:
                bank = ', '.join(data.get('word_bank', []))
                return format_html('<p>{}</p><p>🗃️ Kelime havuzu: {}</p>', data['sentence'], bank)
        except Exception:
            pass
        return 'Geçersiz JSON formatı'
    options_preview.short_description = 'Seçenekler (Önizleme)'

# ── Admin site başlıkları ─────────────────────────────────────────────────────
admin.site.site_header  = '🕌 Faqih Admin Paneli'
admin.site.site_title   = 'Faqih'
admin.site.index_title  = 'İçerik Yönetimi'
```

- [ ] **Step 2: Verify the admin loads without errors**

Run: `cd faqih_backend && python manage.py check`
Expected: `System check identified no issues (0 silenced).`

- [ ] **Step 3: Commit**

```bash
git add faqih_backend/content/admin.py
git commit -m "feat: restructure Django admin for the Lesson layer"
```

---

### Task 5: Rewrite serializers for the Lesson layer

**Files:**
- Modify: `faqih_backend/content/serializers.py`
- Test: `faqih_backend/content/tests.py`

**Interfaces:**
- Consumes: `Category`, `Unit`, `Lesson`, `Exercise` from Task 3.
- Produces: `CategorySerializer` (units → `UnitSummarySerializer`), `UnitSerializer` (lessons → `LessonSummarySerializer`), `LessonSerializer` (intro + exercises → `ExerciseSerializer`). These are the exact classes Task 6's views import.

- [ ] **Step 1: Write the failing test**

Add to `faqih_backend/content/tests.py`:

```python
from .serializers import CategorySerializer, UnitSerializer, LessonSerializer


class SerializerNestingTests(TestCase):
    def setUp(self):
        self.category = Category.objects.create(title='Namaz')
        self.unit = Unit.objects.create(category=self.category, title='Namaz Vakitleri')
        self.lesson = Lesson.objects.create(
            unit=self.unit, title='Vakitler', intro_kind='text',
            intro_text='Namaz vakitleri güneşin konumuna göre belirlenir.',
        )
        Exercise.objects.create(
            lesson=self.lesson, question_type='fill_blank',
            text='Boşluğu doldur', correct_answer='beş',
            options_json='{"sentence": "Günde ___ vakit namaz kılınır.", "word_bank": ["dört", "beş", "altı"]}',
        )

    def test_category_serializer_exposes_lesson_count_not_lessons(self):
        data = CategorySerializer(self.category).data
        self.assertEqual(data['units'][0]['lesson_count'], 1)
        self.assertNotIn('lessons', data['units'][0])

    def test_unit_serializer_exposes_lesson_summaries(self):
        data = UnitSerializer(self.unit).data
        self.assertEqual(len(data['lessons']), 1)
        self.assertEqual(data['lessons'][0]['title'], 'Vakitler')
        self.assertTrue(data['lessons'][0]['has_intro'])
        self.assertNotIn('exercises', data['lessons'][0])

    def test_lesson_serializer_exposes_intro_and_exercises(self):
        data = LessonSerializer(self.lesson).data
        self.assertEqual(data['intro'], {'kind': 'text', 'body': 'Namaz vakitleri güneşin konumuna göre belirlenir.'})
        self.assertEqual(len(data['exercises']), 1)
        exercise = data['exercises'][0]
        self.assertEqual(exercise['question_type'], 'fill_blank')
        self.assertEqual(exercise['correct_answer'], 'beş')
        self.assertEqual(exercise['options']['sentence'], 'Günde ___ vakit namaz kılınır.')
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd faqih_backend && python manage.py test content.SerializerNestingTests -v 2`
Expected: FAIL — `ImportError: cannot import name 'LessonSerializer' from 'content.serializers'`

- [ ] **Step 3: Rewrite `serializers.py`**

Replace the full contents of `faqih_backend/content/serializers.py`:

```python
# content/serializers.py

import json
from rest_framework import serializers
from .models import Category, Unit, Lesson, Exercise


class ExerciseSerializer(serializers.ModelSerializer):
    options = serializers.SerializerMethodField()
    correct_answer = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()

    class Meta:
        model = Exercise
        fields = [
            'id',
            'question_type',
            'text',
            'options',
            'correct_answer',
            'explanation',
            'image',
        ]

    def get_image(self, obj):
        if not obj.image_data:
            return None
        url = '/api/media/soru/%d/' % obj.pk
        request = self.context.get('request')
        return request.build_absolute_uri(url) if request else url

    def _parsed_options(self, obj):
        try:
            return json.loads(obj.options_json)
        except (TypeError, ValueError):
            return None

    def get_options(self, obj):
        """
        Deserialize options_json from raw text into a proper JSON object
        so the frontend receives a parsed structure, not a string.
        Normalizes legacy formats to what the app expects.
        """
        if obj.question_type == 'true_false':
            return ['Doğru', 'Yanlış']
        data = self._parsed_options(obj)
        # Eski format: [{"id": "A", "text": "..."}] → düz metin listesi
        if isinstance(data, list) and data and isinstance(data[0], dict):
            return [o.get('text') or o.get('id', '') for o in data]
        # Hotspot: text alanı yoksa id'yi göster
        if isinstance(data, dict) and isinstance(data.get('hotspots'), list):
            for h in data['hotspots']:
                if isinstance(h, dict) and not h.get('text'):
                    h['text'] = h.get('id', '')
        return data

    def get_correct_answer(self, obj):
        data = self._parsed_options(obj)
        # Eski formatta correct_answer seçenek id'siydi ("D") — metnine çevir
        if isinstance(data, list) and data and isinstance(data[0], dict):
            for o in data:
                if o.get('id') == obj.correct_answer:
                    return o.get('text') or obj.correct_answer
        return obj.correct_answer


class LessonSerializer(serializers.ModelSerializer):
    exercises = ExerciseSerializer(many=True, read_only=True)
    intro = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = [
            'id',
            'title',
            'intro',
            'exercises',
        ]

    def get_intro(self, obj):
        if obj.intro_kind == 'none':
            return None
        if obj.intro_kind == 'text':
            return {'kind': 'text', 'body': obj.intro_text}
        if obj.intro_kind == 'video':
            return {'kind': 'video', 'body': obj.intro_video_url}
        if obj.intro_kind == 'image':
            if not obj.intro_image_data:
                return None
            url = '/api/media/ders-giris/%d/' % obj.pk
            request = self.context.get('request')
            return {'kind': 'image', 'body': request.build_absolute_uri(url) if request else url}
        return None


class LessonSummarySerializer(serializers.ModelSerializer):
    """
    Lightweight lesson serializer used inside UnitSerializer —
    does NOT nest exercises, just enough for the Home screen path map.
    """
    has_intro = serializers.SerializerMethodField()
    exercise_count = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = [
            'id',
            'title',
            'has_intro',
            'exercise_count',
        ]

    def get_has_intro(self, obj):
        return obj.intro_kind != 'none'

    def get_exercise_count(self, obj):
        return obj.exercises.count()


class UnitSerializer(serializers.ModelSerializer):
    lessons = LessonSummarySerializer(many=True, read_only=True)

    class Meta:
        model = Unit
        fields = [
            'id',
            'title',
            'lessons',
        ]


class UnitSummarySerializer(serializers.ModelSerializer):
    """
    Lightweight unit serializer used inside CategorySerializer —
    does NOT nest lessons to keep the category list response small.
    """
    lesson_count = serializers.SerializerMethodField()

    class Meta:
        model = Unit
        fields = [
            'id',
            'title',
            'lesson_count',
        ]

    def get_lesson_count(self, obj):
        return obj.lessons.count()


class CategorySerializer(serializers.ModelSerializer):
    units = UnitSummarySerializer(many=True, read_only=True)

    class Meta:
        model = Category
        fields = [
            'id',
            'title',
            'units',
        ]
```

- [ ] **Step 4: Run tests**

Run: `cd faqih_backend && python manage.py test content -v 2`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add faqih_backend/content/serializers.py faqih_backend/content/tests.py
git commit -m "feat: nest lessons in serializers between units and exercises"
```

---

### Task 6: Add the Lesson API endpoint, update urls/views

**Files:**
- Modify: `faqih_backend/content/views.py`
- Modify: `faqih_backend/content/urls.py`
- Test: `faqih_backend/content/tests.py`

**Interfaces:**
- Consumes: `LessonSerializer`, `ExerciseSerializer`, `CategorySerializer`, `UnitSerializer` from Task 5.
- Produces: `GET /api/lessons/<id>/` (full lesson incl. exercises), `GET /api/media/ders-giris/<id>/` (lesson intro image), `GET /api/units/<id>/` now returns lesson summaries (not exercises directly) — this is the endpoint shape Task 10's frontend `API.js` consumes.

- [ ] **Step 1: Write the failing test**

Add to `faqih_backend/content/tests.py`:

```python
from rest_framework.test import APIClient


class LessonApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        category = Category.objects.create(title='Namaz')
        self.unit = Unit.objects.create(category=category, title='Namaz Vakitleri')
        self.lesson = Lesson.objects.create(unit=self.unit, title='Vakitler')
        Exercise.objects.create(
            lesson=self.lesson, question_type='mcq', text='Kaç vakit?',
            options_json='["4", "5", "6"]', correct_answer='5',
        )

    def test_unit_endpoint_returns_lesson_summaries(self):
        response = self.client.get(f'/api/units/{self.unit.id}/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['lessons']), 1)
        self.assertNotIn('exercises', response.data['lessons'][0])

    def test_lesson_endpoint_returns_full_exercises(self):
        response = self.client.get(f'/api/lessons/{self.lesson.id}/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['exercises']), 1)
        self.assertEqual(response.data['exercises'][0]['correct_answer'], '5')
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd faqih_backend && python manage.py test content.LessonApiTests -v 2`
Expected: FAIL — 404 on `/api/lessons/<id>/` (route doesn't exist yet)

- [ ] **Step 3: Update `views.py`**

Replace the full contents of `faqih_backend/content/views.py`:

```python
# content/views.py

from django.http import Http404, HttpResponse
from rest_framework import viewsets
from .models import Category, Unit, Lesson, Exercise
from .serializers import CategorySerializer, UnitSerializer, LessonSerializer, ExerciseSerializer


def question_image(request, pk):
    """Veritabanında saklanan soru görselini servis eder."""
    try:
        exercise = Exercise.objects.get(pk=pk)
    except Exercise.DoesNotExist:
        raise Http404
    if not exercise.image_data:
        raise Http404
    response = HttpResponse(bytes(exercise.image_data), content_type=exercise.image_mime or 'image/jpeg')
    response['Cache-Control'] = 'public, max-age=86400'
    return response


def lesson_intro_image(request, pk):
    """Veritabanında saklanan ders girişi görselini servis eder."""
    try:
        lesson = Lesson.objects.get(pk=pk)
    except Lesson.DoesNotExist:
        raise Http404
    if not lesson.intro_image_data:
        raise Http404
    response = HttpResponse(bytes(lesson.intro_image_data), content_type=lesson.intro_image_mime or 'image/jpeg')
    response['Cache-Control'] = 'public, max-age=86400'
    return response

class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Tüm kategorileri ve içindeki üniteleri (sadece özet olarak) listeler.
    Mobil uygulamanın ana sayfası burayı çekecek.
    Endpoint: /api/categories/
    """
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

class UnitViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Belirli bir üniteye tıklandığında dersleri (özet) getirir.
    Endpoint: /api/units/
    """
    queryset = Unit.objects.all()
    serializer_class = UnitSerializer

class LessonViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Belirli bir derse tıklandığında girişi ve tüm alıştırmaları getirir.
    Endpoint: /api/lessons/
    """
    queryset = Lesson.objects.all()
    serializer_class = LessonSerializer

class ExerciseViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Tüm alıştırmaları listeler (Gerekirse filtreleme yapılabilir).
    Endpoint: /api/questions/
    """
    queryset = Exercise.objects.all()
    serializer_class = ExerciseSerializer
```

- [ ] **Step 4: Update `urls.py`**

Replace the full contents of `faqih_backend/content/urls.py`:

```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategoryViewSet, UnitViewSet, LessonViewSet, ExerciseViewSet,
    question_image, lesson_intro_image,
)

router = DefaultRouter()
router.register(r'categories', CategoryViewSet)
router.register(r'units', UnitViewSet)
router.register(r'lessons', LessonViewSet)
router.register(r'questions', ExerciseViewSet)

urlpatterns = [
    path('media/soru/<int:pk>/', question_image, name='question_image'),
    path('media/ders-giris/<int:pk>/', lesson_intro_image, name='lesson_intro_image'),
    path('', include(router.urls)),
]
```

- [ ] **Step 5: Run tests**

Run: `cd faqih_backend && python manage.py test content -v 2`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add faqih_backend/content/views.py faqih_backend/content/urls.py faqih_backend/content/tests.py
git commit -m "feat: add /api/lessons/ endpoint and lesson intro image route"
```

---

### Task 7: Backend tests for the two new exercise types end-to-end

**Files:**
- Test: `faqih_backend/content/tests.py`

**Interfaces:**
- Consumes: everything from Tasks 1-6.

- [ ] **Step 1: Write the tests**

Add to `faqih_backend/content/tests.py`:

```python
class NewExerciseTypeApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        category = Category.objects.create(title='Temizlik')
        unit = Unit.objects.create(category=category, title='Abdest')
        self.lesson = Lesson.objects.create(unit=unit, title='Abdest Adımları')

    def test_ordering_exercise_round_trips_steps_in_order(self):
        Exercise.objects.create(
            lesson=self.lesson, question_type='ordering', text='Adımları sırala',
            options_json='{"steps": ["Niyet et", "Elleri yıka", "Ağzı çalkala"]}',
            correct_answer='',
        )
        response = self.client.get(f'/api/lessons/{self.lesson.id}/')
        exercise = response.data['exercises'][0]
        self.assertEqual(exercise['question_type'], 'ordering')
        self.assertEqual(
            exercise['options']['steps'],
            ['Niyet et', 'Elleri yıka', 'Ağzı çalkala'],
        )

    def test_fill_blank_exercise_exposes_sentence_and_word_bank(self):
        Exercise.objects.create(
            lesson=self.lesson, question_type='fill_blank', text='Boşluğu doldur',
            options_json='{"sentence": "Abdestin ___ farzı vardır.", "word_bank": ["dört", "beş", "altı"]}',
            correct_answer='dört',
        )
        response = self.client.get(f'/api/lessons/{self.lesson.id}/')
        exercise = response.data['exercises'][0]
        self.assertEqual(exercise['question_type'], 'fill_blank')
        self.assertEqual(exercise['options']['sentence'], 'Abdestin ___ farzı vardır.')
        self.assertEqual(exercise['options']['word_bank'], ['dört', 'beş', 'altı'])
        self.assertEqual(exercise['correct_answer'], 'dört')
```

- [ ] **Step 2: Run and verify pass**

Run: `cd faqih_backend && python manage.py test content -v 2`
Expected: PASS — all test classes from Tasks 1-7 green.

- [ ] **Step 3: Commit**

```bash
git add faqih_backend/content/tests.py
git commit -m "test: cover ordering and fill_blank exercises end to end"
```

---

### Task 8: Panel — introduce the Lesson layer (create/list lessons, re-scope exercises under a lesson)

**Files:**
- Modify: `faqih_backend/panel/views.py`
- Modify: `faqih_backend/panel/urls.py`
- Modify: `faqih_backend/panel/templates/panel/unit.html`
- Modify: `faqih_backend/panel/templates/panel/base.html`
- Create: `faqih_backend/panel/templates/panel/lesson.html`
- Create: `faqih_backend/panel/templates/panel/lesson_form.html`

**Interfaces:**
- Consumes: `Lesson`, `Exercise` from Task 3.
- Produces: `panel:unit` now lists lessons; new `panel:lesson_new`, `panel:lesson_edit`, `panel:lesson` routes; `panel:type_picker`/`panel:question_new` now take a `lesson_id` instead of `unit_id`.

- [ ] **Step 1: Update `panel/urls.py`**

Replace the full contents of `faqih_backend/panel/urls.py`:

```python
from django.urls import path
from . import views

app_name = 'panel'

urlpatterns = [
    path('', views.home, name='home'),
    path('unite/<int:unit_id>/', views.unit_detail, name='unit'),
    path('unite/<int:unit_id>/ders-ekle/', views.lesson_form, name='lesson_new'),
    path('ders/<int:lesson_id>/', views.lesson_detail, name='lesson'),
    path('ders/<int:lesson_id>/duzenle/', views.lesson_edit, name='lesson_edit'),
    path('ders/<int:lesson_id>/sil/', views.lesson_delete, name='lesson_delete'),
    path('ders/<int:lesson_id>/yeni/', views.type_picker, name='type_picker'),
    path('ders/<int:lesson_id>/yeni/<str:qtype>/', views.question_form, name='question_new'),
    path('soru/<int:question_id>/', views.question_form, name='question_edit'),
    path('soru/<int:question_id>/sil/', views.question_delete, name='question_delete'),
    path('kategori-ekle/', views.add_category, name='add_category'),
    path('unite-ekle/', views.add_unit, name='add_unit'),
]
```

- [ ] **Step 2: Update `panel/views.py`**

This task touches most of the file. Apply these changes to `faqih_backend/panel/views.py`:

**a)** Change the import (line 8):
```python
from content.models import Category, Exercise, Lesson, Unit
```

**b)** Replace `_sidebar_context` (lines 93-97) to prefetch through lessons:
```python
def _sidebar_context(selected_unit=None, selected_lesson=None):
    return {
        'categories': Category.objects.prefetch_related('units__lessons__exercises'),
        'selected_unit': selected_unit,
        'selected_lesson': selected_lesson,
    }
```

**c)** Replace `home` (lines 100-108) — it now redirects into the first *lesson* under the first unit, or to the unit page if the unit has no lessons yet:
```python
@staff_member_required
def home(request):
    unit = Unit.objects.first()
    if unit:
        return redirect('panel:unit', unit.id)
    ctx = _sidebar_context()
    ctx['unit'] = None
    ctx['lessons'] = []
    return render(request, 'panel/unit.html', ctx)
```

**d)** Replace `unit_detail` (lines 111-117) to list lessons instead of exercise rows:
```python
@staff_member_required
def unit_detail(request, unit_id):
    unit = get_object_or_404(Unit, pk=unit_id)
    ctx = _sidebar_context(unit)
    ctx['unit'] = unit
    ctx['lessons'] = unit.lessons.all()
    return render(request, 'panel/unit.html', ctx)
```

**e)** Add `lesson_detail`, right after `unit_detail` — this is what `unit_detail` used to do, one level deeper:
```python
@staff_member_required
def lesson_detail(request, lesson_id):
    lesson = get_object_or_404(Lesson, pk=lesson_id)
    ctx = _sidebar_context(lesson.unit, lesson)
    ctx['unit'] = lesson.unit
    ctx['lesson'] = lesson
    ctx['rows'] = [_row(e) for e in lesson.exercises.all()]
    return render(request, 'panel/lesson.html', ctx)
```

**f)** Update `type_picker` (lines 120-126) to take `lesson_id`:
```python
@staff_member_required
def type_picker(request, lesson_id):
    lesson = get_object_or_404(Lesson, pk=lesson_id)
    ctx = _sidebar_context(lesson.unit, lesson)
    ctx['unit'] = lesson.unit
    ctx['lesson'] = lesson
    ctx['enabled_types'] = [{'key': k, **v} for k, v in ENABLED_TYPES.items()]
    return render(request, 'panel/type_picker.html', ctx)
```

**g)** In `_save_question` (currently lines 146-210), rename the `unit` parameter to `lesson` and the model it creates:
```python
def _save_question(request, lesson, qtype, question=None):
    """Formu doğrula ve kaydet. Hata varsa mesaj listesi döndürür."""
    errors = []
    text = (request.POST.get('text') or '').strip()
    explanation = (request.POST.get('explanation') or '').strip()
    if not text:
        errors.append('Video başlığı boş olamaz.' if qtype == 'video' else 'Soru metni boş olamaz.')

    options_json = ''
    correct = ''
    upload = None

    if qtype == 'mcq':
        options_json, correct = _read_mcq_options(request, errors)

    elif qtype == 'true_false':
        correct = request.POST.get('correct', '')
        if correct not in ('Doğru', 'Yanlış'):
            errors.append('Doğru cevabı seç: Doğru mu, Yanlış mı?')
        options_json = json.dumps(['Doğru', 'Yanlış'], ensure_ascii=False)

    elif qtype == 'matching':
        pairs = []
        for left, right in zip(request.POST.getlist('pl'), request.POST.getlist('pr')):
            left, right = left.strip(), right.strip()
            if left and right:
                pairs.append([left, right])
            elif left or right:
                errors.append('Her çiftin iki tarafı da dolu olmalı.')
                break
        if not errors and len(pairs) < 2:
            errors.append('En az 2 eşleştirme çifti gerekli.')
        options_json = json.dumps({'pairs': pairs}, ensure_ascii=False)

    elif qtype == 'image':
        options_json, correct = _read_mcq_options(request, errors)
        upload = request.FILES.get('image')
        if upload:
            if upload.size > MAX_IMAGE_BYTES:
                errors.append('Görsel en fazla 2 MB olabilir.')
            elif not (upload.content_type or '').startswith('image/'):
                errors.append('Sadece resim dosyası yüklenebilir (JPG/PNG).')
        elif question is None or not question.image_data:
            errors.append('Bir görsel seç.')

    elif qtype == 'video':
        url = (request.POST.get('url') or '').strip()
        if not url.startswith(('http://', 'https://')):
            errors.append('Geçerli bir video bağlantısı gir (https:// ile başlamalı).')
        options_json = json.dumps({'url': url}, ensure_ascii=False)

    if errors:
        return errors

    if question is None:
        question = Exercise(lesson=lesson, question_type=qtype)
    question.text = text
    question.options_json = options_json
    question.correct_answer = correct
    question.explanation = explanation
    if upload is not None:
        question.image_data = upload.read()
        question.image_mime = upload.content_type or 'image/jpeg'
    question.save()
    return []
```

(Task 9 adds the `ordering`/`fill_blank` branches into this same function — leave room, don't rename it again.)

**h)** Update `_option_texts`/`_correct_text`/`_pairs`/`_video_url`/`_row` (lines 38-90) — only the field name changes, logic stays identical:
```python
def _correct_text(question):
    """Doğru cevabı metin olarak döndürür (eski id formatı dahil)."""
    data = _parsed_options(question)
    if isinstance(data, list) and data and isinstance(data[0], dict):
        for o in data:
            if o.get('id') == question.correct_answer:
                return o.get('text') or question.correct_answer
    return question.correct_answer
```
```python
def _row(question):
    qtype = 'mcq' if question.question_type == 'multiple_choice' else question.question_type
    if qtype in ('mcq', 'image'):
        hint = 'Doğru: ' + (_correct_text(question) or '—')
    elif qtype == 'true_false':
        hint = 'Doğru cevap: ' + (question.correct_answer or '—')
    elif qtype == 'matching':
        hint = '%d eşleştirme çifti' % len(_pairs(question))
    elif qtype == 'video':
        hint = _video_url(question) or 'Bağlantı yok'
    else:
        hint = TYPE_LABELS.get(qtype, qtype)
    return {
        'obj': question,
        'qtype': qtype,
        'type_label': TYPE_LABELS.get(qtype, qtype),
        'hint': hint,
        'editable': qtype in ENABLED_TYPES,
    }
```

**i)** Update `_initial_from_question` (lines 224-238) — same field rename:
```python
def _initial_from_question(question, qtype):
    opts = (_option_texts(question) + ['', '', '', ''])[:4]
    correct_text = _correct_text(question)
    if qtype in ('mcq', 'image'):
        correct = str(opts.index(correct_text)) if correct_text in opts else ''
    else:
        correct = question.correct_answer
    return {
        'text': question.text,
        'explanation': question.explanation,
        'options': opts,
        'correct': correct,
        'pairs': _pairs(question),
        'url': _video_url(question),
    }
```

**j)** Update `question_form` (lines 241-287) to work off `lesson_id` instead of `unit_id`, and to redirect back into the lesson page:
```python
@staff_member_required
def question_form(request, lesson_id=None, qtype=None, question_id=None):
    if question_id is not None:
        question = get_object_or_404(Exercise, pk=question_id)
        lesson = question.lesson
        qtype = 'mcq' if question.question_type == 'multiple_choice' else question.question_type
    else:
        question = None
        lesson = get_object_or_404(Lesson, pk=lesson_id)

    if qtype not in ENABLED_TYPES:
        messages.error(request, 'Bu soru türü panelde henüz düzenlenemiyor.')
        return redirect('panel:lesson', lesson.id)

    errors = []
    if request.method == 'POST':
        errors = _save_question(request, lesson, qtype, question)
        if not errors:
            messages.success(request, 'Soru kaydedildi ✓' if question else 'Soru eklendi ✓')
            return redirect('panel:lesson', lesson.id)
        initial = _initial_from_post(request)
    elif question is not None:
        initial = _initial_from_question(question, qtype)
    else:
        initial = {'text': '', 'explanation': '', 'options': ['', '', '', ''],
                   'correct': '', 'pairs': [], 'url': ''}

    pairs = initial.get('pairs') or []
    while len(pairs) < 3:
        pairs.append(['', ''])

    ctx = _sidebar_context(lesson.unit, lesson)
    ctx.update({
        'unit': lesson.unit,
        'lesson': lesson,
        'question': question,
        'qtype': qtype,
        'type_label': ENABLED_TYPES[qtype]['label'],
        'initial': initial,
        'errors': errors,
        'option_rows': [
            {'i': i, 'letter': 'ABCD'[i], 'value': initial['options'][i]}
            for i in range(4)
        ],
        'pair_rows': pairs,
        'has_image': bool(question and question.image_data),
    })
    return render(request, 'panel/question_form.html', ctx)
```

**k)** Update `question_delete` (lines 290-297) — redirect target changes:
```python
@staff_member_required
@require_POST
def question_delete(request, question_id):
    question = get_object_or_404(Exercise, pk=question_id)
    lesson_id = question.lesson_id
    question.delete()
    messages.success(request, 'Soru silindi.')
    return redirect('panel:lesson', lesson_id)
```

**l)** Add `lesson_form`, `lesson_edit`, `lesson_delete` at the end of the file:
```python
def _save_lesson(request, unit, lesson=None):
    errors = []
    title = (request.POST.get('title') or '').strip()
    if not title:
        errors.append('Ders adı boş olamaz.')

    intro_kind = request.POST.get('intro_kind', 'none')
    if intro_kind not in ('none', 'text', 'image', 'video'):
        intro_kind = 'none'

    intro_text = ''
    intro_video_url = ''
    upload = None

    if intro_kind == 'text':
        intro_text = (request.POST.get('intro_text') or '').strip()
        if not intro_text:
            errors.append('Giriş metni boş olamaz.')
    elif intro_kind == 'video':
        intro_video_url = (request.POST.get('intro_video_url') or '').strip()
        if not intro_video_url.startswith(('http://', 'https://')):
            errors.append('Geçerli bir video bağlantısı gir (https:// ile başlamalı).')
    elif intro_kind == 'image':
        upload = request.FILES.get('intro_image')
        if upload:
            if upload.size > MAX_IMAGE_BYTES:
                errors.append('Görsel en fazla 2 MB olabilir.')
            elif not (upload.content_type or '').startswith('image/'):
                errors.append('Sadece resim dosyası yüklenebilir (JPG/PNG).')
        elif lesson is None or not lesson.intro_image_data:
            errors.append('Bir görsel seç.')

    if errors:
        return errors, None

    if lesson is None:
        lesson = Lesson(unit=unit)
    lesson.title = title
    lesson.intro_kind = intro_kind
    lesson.intro_text = intro_text
    lesson.intro_video_url = intro_video_url
    if upload is not None:
        lesson.intro_image_data = upload.read()
        lesson.intro_image_mime = upload.content_type or 'image/jpeg'
    lesson.save()
    return [], lesson


@staff_member_required
def lesson_form(request, unit_id):
    unit = get_object_or_404(Unit, pk=unit_id)
    errors = []
    if request.method == 'POST':
        errors, lesson = _save_lesson(request, unit)
        if not errors:
            messages.success(request, 'Ders eklendi ✓')
            return redirect('panel:lesson', lesson.id)

    ctx = _sidebar_context(unit)
    ctx.update({'unit': unit, 'lesson': None, 'errors': errors})
    return render(request, 'panel/lesson_form.html', ctx)


@staff_member_required
def lesson_edit(request, lesson_id):
    lesson = get_object_or_404(Lesson, pk=lesson_id)
    errors = []
    if request.method == 'POST':
        errors, lesson = _save_lesson(request, lesson.unit, lesson)
        if not errors:
            messages.success(request, 'Ders kaydedildi ✓')
            return redirect('panel:lesson', lesson.id)

    ctx = _sidebar_context(lesson.unit, lesson)
    ctx.update({'unit': lesson.unit, 'lesson': lesson, 'errors': errors})
    return render(request, 'panel/lesson_form.html', ctx)


@staff_member_required
@require_POST
def lesson_delete(request, lesson_id):
    lesson = get_object_or_404(Lesson, pk=lesson_id)
    unit_id = lesson.unit_id
    lesson.delete()
    messages.success(request, 'Ders silindi.')
    return redirect('panel:unit', unit_id)
```

- [ ] **Step 3: Update `unit.html`** to list lessons instead of exercises

Replace the full contents of `faqih_backend/panel/templates/panel/unit.html`:

```html
{% extends "panel/base.html" %}

{% block title %}{% if unit %}{{ unit.title }} — Faqih İçerik Paneli{% else %}Faqih İçerik Paneli{% endif %}{% endblock %}

{% block main %}
  {% if unit %}
    <div class="crumb">{{ unit.category.title }}</div>
    <div class="main-head">
      <div>
        <h1>{{ unit.title }}</h1>
        <div class="sub">{{ lessons|length }} ders</div>
      </div>
      <a class="btn btn-gold" href="{% url 'panel:lesson_new' unit.id %}">+ Yeni Ders</a>
    </div>
    <div class="qlist">
      {% for lesson in lessons %}
        <div class="qrow">
          <span class="chip" style="--tc: var(--muted)">{{ lesson.exercises.count }} alıştırma</span>
          <div class="qtext">
            <div class="t"><a href="{% url 'panel:lesson' lesson.id %}">{{ lesson.title }}</a></div>
            <div class="a">{% if lesson.intro_kind != 'none' %}Giriş: {{ lesson.get_intro_kind_display }}{% else %}Girişsiz{% endif %}</div>
          </div>
          <div class="qacts">
            <a href="{% url 'panel:lesson_edit' lesson.id %}">Düzenle</a>
            <form method="post" action="{% url 'panel:lesson_delete' lesson.id %}"
                  onsubmit="return confirm('Bu ders silinsin mi? İçindeki tüm alıştırmalar da silinir.');">
              {% csrf_token %}
              <button type="submit">Sil</button>
            </form>
          </div>
        </div>
      {% empty %}
        <div class="empty">Bu ünitede henüz ders yok.<br>“+ Yeni Ders” ile ilk dersi ekle.</div>
      {% endfor %}
    </div>
  {% else %}
    <div class="main-head"><h1>Hoş geldin 👋</h1></div>
    <div class="empty">Henüz hiç içerik yok.<br>Soldaki menüden bir kategori ekleyerek başla.</div>
  {% endif %}
{% endblock %}
```

- [ ] **Step 4: Create `lesson.html`** — this is what `unit.html` used to render (the exercise list), one level deeper

Create `faqih_backend/panel/templates/panel/lesson.html`:

```html
{% extends "panel/base.html" %}

{% block title %}{{ lesson.title }} — Faqih İçerik Paneli{% endblock %}

{% block main %}
  <div class="crumb">{{ unit.category.title }} → {{ unit.title }}</div>
  <div class="main-head">
    <div>
      <h1>{{ lesson.title }}</h1>
      <div class="sub">{{ rows|length }} soru</div>
    </div>
    <div style="display:flex;gap:8px">
      <a class="btn btn-ghost" href="{% url 'panel:unit' unit.id %}">‹ Üniteye dön</a>
      <a class="btn btn-gold" href="{% url 'panel:type_picker' lesson.id %}">+ Yeni Soru</a>
    </div>
  </div>
  <div class="qlist">
    {% for r in rows %}
      <div class="qrow">
        <span class="chip" style="--tc: var(--t-{{ r.qtype }}, var(--muted))">{{ r.type_label }}</span>
        <div class="qtext">
          <div class="t">{{ r.obj.text }}</div>
          <div class="a">{{ r.hint }}</div>
        </div>
        <div class="qacts">
          {% if r.editable %}
            <a href="{% url 'panel:question_edit' r.obj.id %}">Düzenle</a>
          {% endif %}
          <form method="post" action="{% url 'panel:question_delete' r.obj.id %}"
                onsubmit="return confirm('Bu soru silinsin mi?');">
            {% csrf_token %}
            <button type="submit">Sil</button>
          </form>
        </div>
      </div>
    {% empty %}
      <div class="empty">Bu derste henüz soru yok.<br>“+ Yeni Soru” ile ilk içeriği ekle.</div>
    {% endfor %}
  </div>
{% endblock %}
```

- [ ] **Step 5a: Fix `type_picker.html` and `question_form.html` to be lesson-scoped, not unit-scoped**

Both templates still say `unit.id` in places that Task 8's view changes (Step 2f/2j above) now pass a `lesson_id` route parameter instead — left as-is, these would generate links to the wrong object entirely (a Unit id where a Lesson id is expected) or read a `unit.questions` relation that no longer exists (`Exercise` now belongs to `lesson`, not `unit`).

Replace the full contents of `faqih_backend/panel/templates/panel/type_picker.html`:

```html
{% extends "panel/base.html" %}

{% block title %}Yeni soru — {{ lesson.title }} — Faqih İçerik Paneli{% endblock %}

{% block main %}
  <div class="crumb">{{ unit.category.title }} → {{ unit.title }} → {{ lesson.title }}</div>
  <div class="main-head">
    <div>
      <h1>Soru türü seç</h1>
      <div class="sub">Nasıl bir soru eklemek istiyorsun?</div>
    </div>
    <a class="btn btn-ghost" href="{% url 'panel:lesson' lesson.id %}">‹ Geri</a>
  </div>
  <div class="type-grid">
    {% for t in enabled_types %}
      <a class="type-card" style="--tc: var(--t-{{ t.key }})" href="{% url 'panel:question_new' lesson.id t.key %}">
        <span class="g">{{ t.glyph }}</span>
        <span class="tl">{{ t.label }}</span>
        <span class="d">{{ t.desc }}</span>
      </a>
    {% endfor %}
  </div>
{% endblock %}
```

In `faqih_backend/panel/templates/panel/question_form.html`, make three fixes:

1. The breadcrumb (line 6) — add the lesson level:
```html
  <div class="crumb">{{ unit.category.title }} → {{ unit.title }} → {{ lesson.title }}</div>
```

2. Both back-links (line 11 and line 104) — change from the unit page to the lesson page:
```html
    <a class="btn btn-ghost" href="{% url 'panel:lesson' lesson.id %}">‹ Geri</a>
```
```html
      <a class="btn btn-ghost" href="{% url 'panel:lesson' lesson.id %}">Vazgeç</a>
```

3. The live-preview question counter (line 112) — `unit.questions` no longer exists (exercises now belong to `lesson`, not `unit`):
```html
        <div class="pv-topbar"><span>✕</span><span>1 / {{ lesson.exercises.count|default:1 }}</span><span class="pv-xp">☀ 10 XP</span></div>
```

- [ ] **Step 5b: Create `lesson_form.html`**

Create `faqih_backend/panel/templates/panel/lesson_form.html`:

```html
{% extends "panel/base.html" %}

{% block title %}{% if lesson %}Dersi Düzenle{% else %}Yeni Ders{% endif %} — Faqih İçerik Paneli{% endblock %}

{% block main %}
  <div class="crumb">{{ unit.category.title }} → {{ unit.title }}</div>
  <div class="main-head">
    <div>
      <h1>{% if lesson %}Dersi Düzenle{% else %}Yeni Ders{% endif %}</h1>
    </div>
    <a class="btn btn-ghost" href="{% url 'panel:unit' unit.id %}">‹ Geri</a>
  </div>

  <form class="form" method="post" enctype="multipart/form-data" style="max-width:520px">
    {% csrf_token %}
    {% if errors %}
      <div class="errors">{% for e in errors %}<div>{{ e }}</div>{% endfor %}</div>
    {% endif %}

    <div class="field">
      <label for="f-title">Ders adı</label>
      <input type="text" id="f-title" name="title" value="{{ lesson.title|default:'' }}" required
        placeholder="Örn: Namazın Farzları">
    </div>

    <div class="field">
      <label>Giriş türü (isteğe bağlı)</label>
      <div class="seg">
        <label>
          <input type="radio" name="intro_kind" value="none" {% if not lesson or lesson.intro_kind == 'none' %}checked{% endif %} onchange="toggleIntro(this.value)">
          <span>Yok</span>
        </label>
        <label>
          <input type="radio" name="intro_kind" value="text" {% if lesson.intro_kind == 'text' %}checked{% endif %} onchange="toggleIntro(this.value)">
          <span>Metin</span>
        </label>
        <label>
          <input type="radio" name="intro_kind" value="image" {% if lesson.intro_kind == 'image' %}checked{% endif %} onchange="toggleIntro(this.value)">
          <span>Görsel</span>
        </label>
        <label>
          <input type="radio" name="intro_kind" value="video" {% if lesson.intro_kind == 'video' %}checked{% endif %} onchange="toggleIntro(this.value)">
          <span>Video</span>
        </label>
      </div>
      <div class="hint">Öğrenci derse başlamadan önce bu içeriği görür. Boş bırakılırsa direkt sorularla başlar.</div>
    </div>

    <div class="field" id="intro-text-field" style="display:none">
      <label for="f-intro-text">Giriş metni</label>
      <textarea id="f-intro-text" name="intro_text" rows="4"
        placeholder="Örn: Namaz, İslam'ın beş vaktinde farz kılınan ibadettir…">{{ lesson.intro_text|default:'' }}</textarea>
    </div>

    <div class="field" id="intro-video-field" style="display:none">
      <label for="f-intro-video">Giriş videosu</label>
      <input type="text" id="f-intro-video" name="intro_video_url" value="{{ lesson.intro_video_url|default:'' }}" placeholder="https://youtu.be/…">
    </div>

    <div class="field" id="intro-image-field" style="display:none">
      <label for="f-intro-image">Giriş görseli {% if lesson.intro_image_data %}(değiştirmek istemiyorsan boş bırak){% endif %}</label>
      {% if lesson.intro_image_data %}
        <img src="/api/media/ders-giris/{{ lesson.id }}/" alt="Mevcut görsel"
             style="max-width:260px;border-radius:12px;display:block;margin-bottom:8px;border:1.5px solid var(--line)">
      {% endif %}
      <input type="file" id="f-intro-image" name="intro_image" accept="image/*">
      <div class="hint">JPG veya PNG, en fazla 2 MB.</div>
    </div>

    <div class="form-acts">
      <button class="btn btn-green" type="submit">Kaydet</button>
      <a class="btn btn-ghost" href="{% url 'panel:unit' unit.id %}">Vazgeç</a>
    </div>
  </form>
{% endblock %}

{% block scripts %}
<script>
  function toggleIntro(kind) {
    document.getElementById('intro-text-field').style.display = kind === 'text' ? '' : 'none';
    document.getElementById('intro-video-field').style.display = kind === 'video' ? '' : 'none';
    document.getElementById('intro-image-field').style.display = kind === 'image' ? '' : 'none';
  }
  toggleIntro(document.querySelector('input[name=intro_kind]:checked').value);
</script>
{% endblock %}
```

- [ ] **Step 6: Update the sidebar in `base.html`**

In `faqih_backend/panel/templates/panel/base.html`, line 154, change:
```html
<span>{{ u.title }}</span><span class="n">{{ u.questions.count }}</span>
```
to:
```html
<span>{{ u.title }}</span><span class="n">{{ u.lessons.count }}</span>
```

Also add two new type-chip CSS variables to the `:root` block (line 14-15), so ordering/fill_blank get distinct colors once Task 9 wires them into the type picker:
```css
--t-mcq: #2D8C4E; --t-true_false: #1F6E80; --t-matching: #8A6620;
--t-image: #7A4A2B; --t-video: #A13327; --t-hotspot: #A13327;
--t-ordering: #6B4FA0; --t-fill_blank: #2C5F8A;
```

- [ ] **Step 7: Manual verification**

Run: `cd faqih_backend && python manage.py runserver`, log in as staff at `/panel/`, and walk through: open a unit → see its (backfilled) lesson listed → open the lesson → see its exercises → edit an existing mcq exercise and save → go back to the unit → add a new lesson with a text intro → confirm it saves and appears in the list.

- [ ] **Step 8: Commit**

```bash
git add faqih_backend/panel/
git commit -m "feat: add Lesson CRUD to the panel, re-scope exercises under lessons"
```

---

### Task 9: Panel — add ordering & fill_blank to the exercise type picker and form

**Files:**
- Modify: `faqih_backend/panel/views.py`
- Modify: `faqih_backend/panel/templates/panel/type_picker.html`
- Modify: `faqih_backend/panel/templates/panel/question_form.html`

**Interfaces:**
- Consumes: `_save_question` from Task 8, `ENABLED_TYPES`/`TYPE_LABELS` constants (top of `panel/views.py`).

- [ ] **Step 1: Register the two new types**

In `faqih_backend/panel/views.py`, extend `ENABLED_TYPES` (lines 13-19):
```python
ENABLED_TYPES = {
    'mcq':        {'label': 'Çoktan Seçmeli', 'glyph': 'A·B', 'desc': '4 seçenek, tek doğru cevap'},
    'true_false': {'label': 'Doğru / Yanlış', 'glyph': '✓✗',  'desc': 'Hızlı bilgi kontrolü'},
    'matching':   {'label': 'Eşleştirme',     'glyph': '⇄',   'desc': 'Terimleri anlamlarıyla eşleştir'},
    'image':      {'label': 'Resimli Soru',   'glyph': '▣',   'desc': 'Görsel üzerinden soru sor'},
    'video':      {'label': 'Video Ders',     'glyph': '▶',   'desc': 'YouTube bağlantısı ile'},
    'ordering':   {'label': 'Sıralama',       'glyph': '1·2', 'desc': 'Adımları doğru sıraya diz'},
    'fill_blank': {'label': 'Boşluk Doldurma', 'glyph': '_·_', 'desc': 'Cümledeki boşluğu kelime havuzundan doldur'},
}
```
and `TYPE_LABELS` (lines 20-28):
```python
TYPE_LABELS = {
    'mcq': 'Çoktan Seçmeli',
    'multiple_choice': 'Çoktan Seçmeli',
    'true_false': 'Doğru / Yanlış',
    'matching': 'Eşleştirme',
    'image': 'Resimli Soru',
    'video': 'Video Ders',
    'ordering': 'Sıralama',
    'fill_blank': 'Boşluk Doldurma',
    'hotspot': 'Hotspot',
}
```

- [ ] **Step 2: Add hints for the two new types in `_row`**

In `_row` (already updated in Task 8), add two branches:
```python
def _row(question):
    qtype = 'mcq' if question.question_type == 'multiple_choice' else question.question_type
    if qtype in ('mcq', 'image'):
        hint = 'Doğru: ' + (_correct_text(question) or '—')
    elif qtype == 'true_false':
        hint = 'Doğru cevap: ' + (question.correct_answer or '—')
    elif qtype == 'matching':
        hint = '%d eşleştirme çifti' % len(_pairs(question))
    elif qtype == 'video':
        hint = _video_url(question) or 'Bağlantı yok'
    elif qtype == 'ordering':
        hint = '%d adım' % len(_ordering_steps(question))
    elif qtype == 'fill_blank':
        hint = 'Doğru kelime: ' + (question.correct_answer or '—')
    else:
        hint = TYPE_LABELS.get(qtype, qtype)
    return {
        'obj': question,
        'qtype': qtype,
        'type_label': TYPE_LABELS.get(qtype, qtype),
        'hint': hint,
        'editable': qtype in ENABLED_TYPES,
    }
```

Add the helper `_ordering_steps` next to `_pairs` (near line 58-62):
```python
def _ordering_steps(question):
    data = _parsed_options(question)
    if isinstance(data, dict) and isinstance(data.get('steps'), list):
        return [str(s) for s in data['steps']]
    return []


def _fill_blank_parts(question):
    data = _parsed_options(question)
    if isinstance(data, dict):
        return data.get('sentence', ''), [str(w) for w in data.get('word_bank', [])]
    return '', []
```

- [ ] **Step 3: Add form handling in `_save_question`**

In `_save_question` (Task 8), add two branches right after the `elif qtype == 'video':` block and before `if errors:`:
```python
    elif qtype == 'ordering':
        steps = [(s or '').strip() for s in request.POST.getlist('step')]
        steps = [s for s in steps if s]
        if len(steps) < 2:
            errors.append('En az 2 adım gerekli.')
        options_json = json.dumps({'steps': steps}, ensure_ascii=False)
        correct = ''

    elif qtype == 'fill_blank':
        sentence = (request.POST.get('sentence') or '').strip()
        word_bank = [(w or '').strip() for w in request.POST.getlist('word')]
        word_bank = [w for w in word_bank if w]
        correct = (request.POST.get('fb_correct') or '').strip()
        if '___' not in sentence:
            errors.append('Cümlede boşluk için ___ kullan.')
        if len(word_bank) < 2:
            errors.append('En az 2 kelime gerekli (doğrusu dahil).')
        if correct and correct not in word_bank:
            errors.append('Doğru kelime, kelime havuzunda olmalı.')
        if not correct:
            errors.append('Doğru kelimeyi seç.')
        options_json = json.dumps({'sentence': sentence, 'word_bank': word_bank}, ensure_ascii=False)
```

- [ ] **Step 4: Add initial-value handling for edit forms**

In `_initial_from_post` (Task 8's version stays, extend it):
```python
def _initial_from_post(request):
    return {
        'text': request.POST.get('text', ''),
        'explanation': request.POST.get('explanation', ''),
        'options': [(request.POST.get('opt%d' % i) or '') for i in range(4)],
        'correct': request.POST.get('correct', ''),
        'pairs': [list(p) for p in zip(request.POST.getlist('pl'), request.POST.getlist('pr'))],
        'url': request.POST.get('url', ''),
        'steps': [s for s in request.POST.getlist('step') if s],
        'sentence': request.POST.get('sentence', ''),
        'word_bank': [w for w in request.POST.getlist('word') if w],
        'fb_correct': request.POST.get('fb_correct', ''),
    }
```

In `_initial_from_question`:
```python
def _initial_from_question(question, qtype):
    opts = (_option_texts(question) + ['', '', '', ''])[:4]
    correct_text = _correct_text(question)
    if qtype in ('mcq', 'image'):
        correct = str(opts.index(correct_text)) if correct_text in opts else ''
    else:
        correct = question.correct_answer
    sentence, word_bank = _fill_blank_parts(question)
    return {
        'text': question.text,
        'explanation': question.explanation,
        'options': opts,
        'correct': correct,
        'pairs': _pairs(question),
        'url': _video_url(question),
        'steps': _ordering_steps(question),
        'sentence': sentence,
        'word_bank': word_bank,
        'fb_correct': question.correct_answer,
    }
```

And in `question_form`'s fallback initial dict (the `else:` branch for a brand-new question):
```python
        initial = {'text': '', 'explanation': '', 'options': ['', '', '', ''],
                   'correct': '', 'pairs': [], 'url': '',
                   'steps': [], 'sentence': '', 'word_bank': [], 'fb_correct': ''}
```

Then, still in `question_form`, after the existing `pairs` padding block, add padding for the two new lists so templates can always render a fixed number of rows:
```python
    steps = initial.get('steps') or []
    while len(steps) < 3:
        steps.append('')

    word_bank = initial.get('word_bank') or []
    while len(word_bank) < 4:
        word_bank.append('')
```
and add `'step_rows': steps, 'word_rows': word_bank,` to the `ctx.update({...})` call.

- [ ] **Step 5: Add the two type cards to `type_picker.html`**

No change needed — `type_picker.html` already loops over `enabled_types`, which now includes `ordering` and `fill_blank` automatically via Step 1.

- [ ] **Step 6: Add form fields to `question_form.html`**

In `faqih_backend/panel/templates/panel/question_form.html`, after the `{% elif qtype == 'matching' %}` block (before its closing `{% endif %}` on the line that currently reads just `{% endif %}` after the matching field), add:
```html
      {% elif qtype == 'ordering' %}
        <div class="field">
          <label>Adımlar (doğru sırada yaz)</label>
          <div id="steps">
            {% for s in step_rows %}
              <div class="pair-row" style="grid-template-columns: auto 1fr auto">
                <span class="letter">{{ forloop.counter }}</span>
                <input type="text" name="step" value="{{ s }}" placeholder="{{ forloop.counter }}. adım">
                <button type="button" class="rm" title="Adımı sil">✕</button>
              </div>
            {% endfor %}
          </div>
          <button type="button" class="btn btn-ghost" id="addstep">+ Adım ekle</button>
          <div class="hint">Öğrenciye karışık sırada gösterilir, doğru sıraya dizmesi istenir.</div>
        </div>
      {% elif qtype == 'fill_blank' %}
        <div class="field">
          <label for="f-sentence">Cümle (boşluk için ___ kullan)</label>
          <input type="text" id="f-sentence" name="sentence" value="{{ initial.sentence }}"
            placeholder="Örn: Abdestin ___ farzı vardır.">
        </div>
        <div class="field">
          <label>Kelime havuzu (doğrusunu ✓ ile işaretle)</label>
          {% for w in word_rows %}
            <div class="opt-row">
              <span class="letter">{{ forloop.counter }}</span>
              <input type="text" name="word" value="{{ w }}" placeholder="{{ forloop.counter }}. kelime">
              <label title="Doğru kelime olarak işaretle">
                <input type="radio" name="fb_correct_idx" value="{{ forloop.counter0 }}"
                  {% if initial.fb_correct == w %}checked{% endif %}>
                <span class="mark">✓</span>
              </label>
            </div>
          {% endfor %}
          <input type="hidden" name="fb_correct" id="f-fb-correct" value="{{ initial.fb_correct }}">
          <div class="hint">✓ ile doğru kelimeyi işaretle.</div>
        </div>
      {% endif %}
```

- [ ] **Step 7: Wire the `fb_correct` hidden field and add live-preview support**

At the end of the `{% block scripts %}` section in `question_form.html`, before the closing `})();`, add:
```javascript
  var fbCorrectHidden = document.getElementById('f-fb-correct');
  if (fbCorrectHidden) {
    form.querySelectorAll('input[name=fb_correct_idx]').forEach(function (radio) {
      radio.addEventListener('change', function () {
        var wordInput = form.querySelector('[name=word]:nth-of-type(' + (parseInt(radio.value, 10) + 1) + ')');
        // radios and word inputs are siblings within the same .opt-row, so read from that row directly:
        fbCorrectHidden.value = radio.closest('.opt-row').querySelector('[name=word]').value.trim();
      });
    });
    form.querySelectorAll('input[name=word]').forEach(function (input) {
      input.addEventListener('input', function () {
        var checked = form.querySelector('input[name=fb_correct_idx]:checked');
        if (checked && checked.closest('.opt-row').querySelector('[name=word]') === input) {
          fbCorrectHidden.value = input.value.trim();
        }
      });
    });
  }

  var stepsBox = document.getElementById('steps');
  if (stepsBox) {
    document.getElementById('addstep').addEventListener('click', function () {
      var row = stepsBox.querySelector('.pair-row').cloneNode(true);
      row.querySelector('input').value = '';
      stepsBox.appendChild(row);
      bindRemoveSteps();
    });
    function bindRemoveSteps() {
      stepsBox.querySelectorAll('.rm').forEach(function (b) {
        b.onclick = function () {
          if (stepsBox.querySelectorAll('.pair-row').length > 1) {
            b.closest('.pair-row').remove();
          }
        };
      });
    }
    bindRemoveSteps();
  }
```

(This task intentionally does not extend the live phone-preview pane for the two new types — the preview already degrades gracefully to just showing the question text for any type it doesn't specifically render, per the existing `{% else %}`-less structure in the preview block. Extending the preview visually is a nice-to-have, not required for the panel to be usable, and is left for the content-production phase.)

- [ ] **Step 8: Manual verification**

Run: `cd faqih_backend && python manage.py runserver`, open a lesson in the panel, click "+ Yeni Soru", pick "Sıralama", enter 3 steps, save — confirm it appears in the exercise list with a "3 adım" hint. Repeat for "Boşluk Doldurma" with a sentence containing `___`, 3 word-bank entries, and one marked correct — confirm it saves and the hint shows the correct word.

- [ ] **Step 9: Commit**

```bash
git add faqih_backend/panel/
git commit -m "feat: add ordering and fill_blank exercise types to the panel"
```

---

### Task 10: Frontend API client — fetch lessons

**Files:**
- Modify: `faqih-frontend/src/API.js`

**Interfaces:**
- Produces: `getCategories()` (unchanged shape), `getUnit(id)` (now returns `{id, title, lessons: [{id, title, has_intro, exercise_count}]}`), new `getLesson(id)` returning `{id, title, intro, exercises}` — this is what Task 13's `LessonScreen` calls.

- [ ] **Step 1: Rewrite `API.js`**

Replace the full contents of `faqih-frontend/src/API.js`:

```javascript
// src/api.js — Faqih API Client

import axios from 'axios';

// ── Change this to your machine's local IP when running backend locally ──────
// e.g. 'http://192.168.1.42:8000'  (do NOT use localhost on a real device)
const BASE_URL = 'https://faqih.onrender.com';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' },
});

// ── API calls ─────────────────────────────────────────────────────────────────

export async function getCategories() {
  try {
    const res = await client.get('/api/categories/');
    return res.data;
  } catch {
    console.warn('API unavailable — using mock data');
    return MOCK_CATEGORIES;
  }
}

export async function getUnit(id) {
  try {
    const res = await client.get(`/api/units/${id}/`);
    return res.data;
  } catch {
    console.warn('API unavailable — using mock data');
    return MOCK_UNITS[id] ?? null;
  }
}

export async function getLesson(id) {
  try {
    const res = await client.get(`/api/lessons/${id}/`);
    return res.data;
  } catch {
    console.warn('API unavailable — using mock data');
    return MOCK_LESSONS[id] ?? null;
  }
}

// ── Mock data (used when backend is not running) ──────────────────────────────

const MOCK_CATEGORIES = [
  {
    id: 1,
    title: 'Temizlik',
    units: [
      { id: 1, title: 'Abdest', lesson_count: 2 },
      { id: 2, title: 'Gusül', lesson_count: 1 },
    ],
  },
  {
    id: 2,
    title: 'Namaz',
    units: [
      { id: 4, title: 'Namaz Vakitleri', lesson_count: 1 },
    ],
  },
];

const MOCK_UNITS = {
  1: {
    id: 1,
    title: 'Abdest',
    lessons: [
      { id: 1, title: 'Abdestin Farzları', has_intro: true, exercise_count: 3 },
      { id: 2, title: 'Abdesti Bozan Şeyler', has_intro: false, exercise_count: 2 },
    ],
  },
};

const MOCK_LESSONS = {
  1: {
    id: 1,
    title: 'Abdestin Farzları',
    intro: {
      kind: 'text',
      body: 'Abdest, namazdan önce yapılan bir temizlenme ibadetidir. Hanefi mezhebine göre 4 farzı vardır.',
    },
    exercises: [
      {
        id: 1,
        question_type: 'mcq',
        text: 'Abdestin kaç farzı vardır?',
        options: ['2', '4', '6', '8'],
        correct_answer: '4',
        explanation: 'Hanefi mezhebine göre abdestin 4 farzı vardır: Yüzü yıkamak, kolları yıkamak, başı meshetmek ve ayakları yıkamak.',
      },
      {
        id: 2,
        question_type: 'ordering',
        text: 'Abdest adımlarını doğru sıraya diz.',
        options: { steps: ['Niyet et', 'Elleri yıka', 'Ağzı çalkala', 'Yüzü yıka'] },
        correct_answer: '',
        explanation: 'Abdest bu sırayla alınır.',
      },
      {
        id: 3,
        question_type: 'fill_blank',
        text: 'Boşluğu doldur.',
        options: { sentence: 'Abdestte kollar ___ kadar yıkanır.', word_bank: ['bileklere', 'dirseklere', 'omuzlara'] },
        correct_answer: 'dirseklere',
        explanation: 'Kollar dirsekler dahil dirseklere kadar yıkanmalıdır.',
      },
    ],
  },
};
```

- [ ] **Step 2: Manual verification**

Run: `cd faqih-frontend && npx expo start --web`, confirm the app still loads the Home screen without crashing (it will still be reading the old `unit.questions` shape until Task 14 — that's expected and fixed in that task).

- [ ] **Step 3: Commit**

```bash
git add faqih-frontend/src/API.js
git commit -m "feat: add getLesson to the API client, update mock data to the lesson shape"
```

---

### Task 11: Frontend — the lesson session engine (mistake-queue logic)

**Files:**
- Create: `faqih-frontend/src/logic/lessonSession.js`
- Create: `faqih-frontend/src/logic/lessonSession.test.js`
- Modify: `faqih-frontend/package.json`

**Interfaces:**
- Produces: `createSession(exercises)` → session object; `answerCurrent(session, isCorrect)` → new session object. Pure functions, no React/RN imports — this is what Task 13's `LessonScreen` imports and drives.

- [ ] **Step 1: Add the `test` script**

In `faqih-frontend/package.json`, add to `"scripts"`:
```json
    "test": "node --test src/logic"
```

- [ ] **Step 2: Write the failing test**

Create `faqih-frontend/src/logic/lessonSession.test.js`:

```javascript
const test = require('node:test');
const assert = require('node:assert/strict');
const { createSession, answerCurrent } = require('./lessonSession');

test('starts with all exercises queued in order and not finished', () => {
  const session = createSession([{ id: 1 }, { id: 2 }, { id: 3 }]);
  assert.equal(session.finished, false);
  assert.equal(session.current.id, 1);
  assert.equal(session.mistakeCount, 0);
});

test('a correct answer advances to the next exercise', () => {
  let session = createSession([{ id: 1 }, { id: 2 }]);
  session = answerCurrent(session, true);
  assert.equal(session.current.id, 2);
  assert.equal(session.finished, false);
});

test('a wrong answer resurfaces the exercise later, not immediately next', () => {
  let session = createSession([{ id: 1 }, { id: 2 }, { id: 3 }]);
  session = answerCurrent(session, false); // miss exercise 1
  assert.notEqual(session.current.id, 1, 'the missed exercise should not be immediately next');
  assert.equal(session.mistakeCount, 1);
});

test('the lesson finishes only once every exercise has been answered correctly at least once', () => {
  let session = createSession([{ id: 1 }, { id: 2 }]);
  session = answerCurrent(session, false); // miss 1, queue: [2, 1]
  session = answerCurrent(session, true);  // pass 2, queue: [1]
  assert.equal(session.finished, false);
  session = answerCurrent(session, true);  // pass 1 (retry)
  assert.equal(session.finished, true);
  assert.equal(session.mistakeCount, 1);
});

test('answering after the session is finished is a no-op', () => {
  let session = createSession([{ id: 1 }]);
  session = answerCurrent(session, true);
  assert.equal(session.finished, true);
  const again = answerCurrent(session, true);
  assert.equal(again, session, 'should return the same session unchanged');
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd faqih-frontend && npm test`
Expected: FAIL — `Error: Cannot find module './lessonSession'`

- [ ] **Step 4: Implement the session engine**

Create `faqih-frontend/src/logic/lessonSession.js`:

```javascript
// src/logic/lessonSession.js — pure mistake-queue engine for a lesson.
// No React/RN imports on purpose: this is unit-tested directly with `node --test`.
//
// A wrong answer is requeued a few exercises later (not immediately next),
// so the lesson only finishes once every exercise has been answered correctly
// at least once. Sessions are never persisted — exiting a lesson always
// restarts clean (see docs/superpowers/specs/2026-08-05-curriculum-lesson-model-design.md).

const RESURFACE_OFFSET = 2;

function createSession(exercises) {
  const queue = exercises.map((_, i) => i);
  return {
    exercises,
    queue,
    mistakeCount: 0,
    finished: queue.length === 0,
    current: exercises[queue[0]] ?? null,
  };
}

function answerCurrent(session, isCorrect) {
  if (session.finished) return session;

  const [answeredIndex, ...rest] = session.queue;
  let nextQueue = rest;

  if (!isCorrect) {
    const insertAt = Math.min(RESURFACE_OFFSET, nextQueue.length);
    nextQueue = [
      ...nextQueue.slice(0, insertAt),
      answeredIndex,
      ...nextQueue.slice(insertAt),
    ];
  }

  const finished = nextQueue.length === 0;
  return {
    ...session,
    queue: nextQueue,
    mistakeCount: session.mistakeCount + (isCorrect ? 0 : 1),
    finished,
    current: finished ? null : session.exercises[nextQueue[0]],
  };
}

module.exports = { createSession, answerCurrent };
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd faqih-frontend && npm test`
Expected: PASS — 5 tests, 0 failures

- [ ] **Step 6: Commit**

```bash
git add faqih-frontend/src/logic/ faqih-frontend/package.json
git commit -m "feat: add pure mistake-queue lesson session engine with unit tests"
```

---

### Task 12: Frontend — Ordering and FillBlank exercise components

**Files:**
- Create: `faqih-frontend/src/components/ExerciseTypes.js`

**Interfaces:**
- Consumes: `colors`/`radius`/`shadow`/`spacing` from `theme.js`.
- Produces: `<OrderingExercise steps={string[]} onSubmit={(orderedSteps) => void} disabled={bool} />`, `<FillBlankExercise sentence={string} wordBank={string[]} onSubmit={(word) => void} disabled={bool} />` — both tap-based, no drag library, matching the existing `matching` exercise's interaction style in `QuizScreen.js`. These are what Task 13's `LessonScreen` renders for the two new types.

- [ ] **Step 1: Implement the components**

Create `faqih-frontend/src/components/ExerciseTypes.js`:

```javascript
// src/components/ExerciseTypes.js — Ordering & Fill-in-the-blank exercises
//
// Both are tap-based (no drag library in this project): ordering fills numbered
// slots one tap at a time, fill_blank is a single-choice word bank — same
// interaction shape as the existing OptionButton, just applied differently.

import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius, shadow, spacing } from '../theme';
import { PrimaryButton } from './CustomButton';

function shuffled(items) {
  const arr = items.map((item, i) => ({ item, i }));
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── Ordering ───────────────────────────────────────────────────────────────
export function OrderingExercise({ steps, onSubmit, disabled }) {
  const pool = useMemo(() => shuffled(steps), [steps]);
  const [placed, setPlaced] = useState([]); // array of original indices, in the order tapped

  const remaining = pool.filter(p => !placed.includes(p.i));

  const tapStep = (originalIndex) => {
    if (disabled || placed.includes(originalIndex)) return;
    const next = [...placed, originalIndex];
    setPlaced(next);
    if (next.length === steps.length) {
      onSubmit(next.map(i => steps[i]));
    }
  };

  return (
    <View style={ordStyles.wrap}>
      <View style={ordStyles.slots}>
        {steps.map((_, slotIndex) => (
          <View key={slotIndex} style={ordStyles.slot}>
            <Text style={ordStyles.slotNum}>{slotIndex + 1}</Text>
            <Text style={ordStyles.slotText} numberOfLines={2}>
              {placed[slotIndex] !== undefined ? steps[placed[slotIndex]] : ''}
            </Text>
          </View>
        ))}
      </View>
      <View style={ordStyles.pool}>
        {remaining.map(({ item, i }) => (
          <TouchableOpacity key={i} style={ordStyles.chip} onPress={() => tapStep(i)} activeOpacity={0.8}>
            <Text style={ordStyles.chipText}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const ordStyles = StyleSheet.create({
  wrap: { gap: 14 },
  slots: { gap: 8 },
  slot: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.neutral,
    paddingVertical: 12, paddingHorizontal: 14, minHeight: 48,
  },
  slotNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, color: colors.white, textAlign: 'center', fontSize: 12, fontWeight: '800', lineHeight: 22 },
  slotText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  pool: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: colors.goldPale, borderRadius: radius.full,
    borderWidth: 1.5, borderColor: colors.goldLight,
    paddingVertical: 10, paddingHorizontal: 16, ...shadow.sm,
  },
  chipText: { fontSize: 14, fontWeight: '700', color: colors.text },
});

// ── Fill in the blank ────────────────────────────────────────────────────────
export function FillBlankExercise({ sentence, wordBank, onSubmit, disabled }) {
  const [picked, setPicked] = useState(null);
  const parts = sentence.split('___');

  const pick = (word) => {
    if (disabled) return;
    setPicked(word);
    onSubmit(word);
  };

  return (
    <View style={fbStyles.wrap}>
      <Text style={fbStyles.sentence}>
        {parts[0]}
        <Text style={fbStyles.blank}>{picked || '＿＿＿'}</Text>
        {parts[1] ?? ''}
      </Text>
      <View style={fbStyles.bank}>
        {wordBank.map((word, i) => (
          <TouchableOpacity
            key={i}
            disabled={disabled}
            style={[fbStyles.chip, picked === word && fbStyles.chipPicked]}
            onPress={() => pick(word)}
            activeOpacity={0.8}
          >
            <Text style={[fbStyles.chipText, picked === word && fbStyles.chipTextPicked]}>{word}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const fbStyles = StyleSheet.create({
  wrap: { gap: 16 },
  sentence: { fontSize: 17, lineHeight: 26, color: colors.text, fontWeight: '600' },
  blank: { color: colors.primary, fontWeight: '800', textDecorationLine: 'underline' },
  bank: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: colors.card, borderRadius: radius.full,
    borderWidth: 1.5, borderColor: colors.neutral,
    paddingVertical: 10, paddingHorizontal: 18, ...shadow.sm,
  },
  chipPicked: { backgroundColor: '#EEF5F1', borderColor: colors.primary },
  chipText: { fontSize: 14, fontWeight: '700', color: colors.text },
  chipTextPicked: { color: colors.primary },
});
```

- [ ] **Step 2: Commit**

```bash
git add faqih-frontend/src/components/ExerciseTypes.js
git commit -m "feat: add tap-based Ordering and FillBlank exercise components"
```

(No automated test here — this is a visual component wired into `LessonScreen` in Task 13 and checked there via the manual walkthrough. Its correctness logic, "did the learner get it right," is intentionally trivial: exact array/string equality, done inline in `LessonScreen`.)

---

### Task 13: Frontend — `LessonScreen` (replaces `QuizScreen`)

**Files:**
- Create: `faqih-frontend/src/screens/LessonScreen.js`
- Delete: `faqih-frontend/src/screens/QuizScreen.js`

**Interfaces:**
- Consumes: `getLesson(id)` (Task 10), `createSession`/`answerCurrent` (Task 11), `OrderingExercise`/`FillBlankExercise` (Task 12), `OptionButton`/`PrimaryButton` (existing `CustomButton.js`).
- Produces: `<LessonScreen route={{params: {lessonId, lessonTitle}}} navigation />` — the route Task 14's Home screen and Task 15's `App.js` navigate to.

- [ ] **Step 1: Implement `LessonScreen.js`**

Create `faqih-frontend/src/screens/LessonScreen.js`. This follows `QuizScreen.js`'s existing structure and styling closely — same `STATE` machine shape, same feedback/results patterns — but drives exercise order through `lessonSession` instead of a flat index, and adds an intro step plus the two new exercise types:

```javascript
// src/screens/LessonScreen.js

import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image, Linking,
  StyleSheet, Animated, ActivityIndicator, SafeAreaView, StatusBar,
} from 'react-native';
import { getLesson } from '../API';
import { colors, radius, shadow, spacing, fonts } from '../theme';
import { OptionButton, PrimaryButton } from '../components/CustomButton';
import { OrderingExercise, FillBlankExercise } from '../components/ExerciseTypes';
import { createSession, answerCurrent } from '../logic/lessonSession';
import { useLang, useRTL } from '../i18n';

const STATE = { LOADING: 'loading', INTRO: 'intro', QUESTION: 'question', FEEDBACK: 'feedback', RESULTS: 'results' };

export default function LessonScreen({ route, navigation }) {
  const { lessonId, lessonTitle }  = route.params;
  const { t }                      = useLang();
  const { isRTL, flexDirection }   = useRTL();

  const [lesson, setLesson]     = useState(null);
  const [session, setSession]   = useState(null);
  const [selected, setSelected] = useState(null);
  const [mistakes, setMistakes] = useState([]);
  const [resultCorrect, setResultCorrect] = useState(false);
  const [state, setState]       = useState(STATE.LOADING);

  // Eşleştirme sorusu durumu (mcq/matching/video değişmeden QuizScreen'den taşındı)
  const [matchSel, setMatchSel]     = useState(null);
  const [matched, setMatched]       = useState({});
  const [matchWrong, setMatchWrong] = useState(0);
  const [wrongFlash, setWrongFlash] = useState(null);

  const feedbackAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim    = useRef(new Animated.Value(0)).current;
  const cardAnim     = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    getLesson(lessonId).then(data => {
      setLesson(data);
      if (data.intro) {
        setState(STATE.INTRO);
      } else {
        setSession(createSession(data.exercises));
        setState(STATE.QUESTION);
        animateCardIn();
      }
    });
  }, []);

  const animateCardIn = () => {
    cardAnim.setValue(30);
    Animated.spring(cardAnim, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }).start();
  };

  const startExercises = () => {
    setSession(createSession(lesson.exercises));
    setState(STATE.QUESTION);
    animateCardIn();
  };

  useEffect(() => {
    if (session && lesson) {
      const progress = 1 - session.queue.length / (lesson.exercises.length + 1);
      Animated.timing(progressAnim, { toValue: Math.max(progress, 0), duration: 400, useNativeDriver: false }).start();
    }
  }, [session, lesson]);

  const question = session?.current;
  const pairs = question?.question_type === 'matching' ? (question.options?.pairs ?? []) : [];
  const rightOrder = useMemo(() => {
    const idx = pairs.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    return idx;
  }, [question?.id]);

  const resetMatching = () => {
    setMatchSel(null); setMatched({}); setMatchWrong(0); setWrongFlash(null);
  };

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,  duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const settle = (isCorrect, chosenLabel) => {
    setResultCorrect(isCorrect);
    if (!isCorrect) {
      setMistakes(m => [...m, { question, chosen: chosenLabel }]);
      shake();
    }
    setState(STATE.FEEDBACK);
    Animated.timing(feedbackAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  };

  const handleAnswer = (answer) => {
    if (state !== STATE.QUESTION) return;
    setSelected(answer);
    settle(answer === question.correct_answer, answer);
  };

  const handleOrderingSubmit = (orderedSteps) => {
    if (state !== STATE.QUESTION) return;
    const correct = JSON.stringify(orderedSteps) === JSON.stringify(question.options.steps);
    settle(correct, orderedSteps.join(' → '));
  };

  const handleFillBlankSubmit = (word) => {
    if (state !== STATE.QUESTION) return;
    setSelected(word);
    settle(word === question.correct_answer, word);
  };

  const handleMatchLeft = (i) => {
    if (state !== STATE.QUESTION || matched[i]) return;
    setMatchSel(i);
  };

  const handleMatchRight = (i) => {
    if (state !== STATE.QUESTION || matchSel === null || matched[i]) return;
    if (i === matchSel) {
      const next = { ...matched, [i]: true };
      setMatched(next);
      setMatchSel(null);
      if (Object.keys(next).length === pairs.length) {
        settle(matchWrong === 0, `${matchWrong} ✗`);
        setSelected('__done__');
      }
    } else {
      setMatchWrong(w => w + 1);
      setWrongFlash(i);
      shake();
      setTimeout(() => setWrongFlash(null), 450);
      setMatchSel(null);
    }
  };

  const advance = () => {
    const isCorrect = resultCorrect;
    const nextSession = answerCurrent(session, isCorrect);
    setSession(nextSession);
    feedbackAnim.setValue(0); setSelected(null); resetMatching();
    if (nextSession.finished) {
      setState(STATE.RESULTS);
    } else {
      setState(STATE.QUESTION);
      animateCardIn();
    }
  };

  const handleVideoDone = () => {
    if (state !== STATE.QUESTION) return;
    setResultCorrect(true);
    const nextSession = answerCurrent(session, true);
    setSession(nextSession);
    resetMatching();
    if (nextSession.finished) { setState(STATE.RESULTS); }
    else { setState(STATE.QUESTION); animateCardIn(); }
  };

  const handleRetry = () => {
    setSession(createSession(lesson.exercises));
    setSelected(null); setMistakes([]); resetMatching();
    setState(STATE.QUESTION); feedbackAnim.setValue(0); animateCardIn();
  };

  const getOptionState = (opt) => {
    if (state === STATE.QUESTION) return 'idle';
    if (opt === question.correct_answer) return 'correct';
    if (opt === selected) return 'wrong';
    return 'idle';
  };

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const isCorrect = resultCorrect;

  // Loading
  if (state === STATE.LOADING) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  // Intro
  if (state === STATE.INTRO) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" />
        <ScrollView contentContainerStyle={styles.introScroll}>
          <View style={styles.introCard}>
            <Text style={styles.introTitle}>{lessonTitle}</Text>
            {lesson.intro.kind === 'text' && (
              <Text style={[styles.introText, isRTL && styles.rtlText]}>{lesson.intro.body}</Text>
            )}
            {lesson.intro.kind === 'image' && (
              <Image source={{ uri: lesson.intro.body }} style={styles.introImage} resizeMode="cover" />
            )}
            {lesson.intro.kind === 'video' && (
              <TouchableOpacity onPress={() => Linking.openURL(lesson.intro.body)} style={styles.introVideo}>
                <Text style={styles.introVideoIcon}>▶</Text>
              </TouchableOpacity>
            )}
          </View>
          <PrimaryButton title={t.quiz.continue} onPress={startExercises} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Results
  if (state === STATE.RESULTS) {
    const total    = lesson.exercises.length;
    const pct      = Math.round(((total - mistakes.length) / total) * 100);
    const isPerfect = mistakes.length === 0;
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" />
        <ScrollView contentContainerStyle={styles.resultScroll}>
          <View style={styles.trophyCircle}>
            <Text style={styles.trophyEmoji}>{isPerfect ? '🏆' : pct >= 60 ? '🌟' : '📚'}</Text>
          </View>
          <Text style={styles.resultTitle}>
            {isPerfect ? t.results.perfect : pct >= 60 ? t.results.great : t.results.keepGoing}
          </Text>
          <Text style={styles.resultSubtitle}>{lessonTitle} {t.results.completed}</Text>

          <View style={styles.resultStats}>
            {[
              { value: `${pct}%`, label: t.results.accuracy },
              { value: total, label: t.results.correct },
              { value: mistakes.length, label: t.results.mistakes },
            ].map((s, i) => (
              <View key={i} style={styles.resultStat}>
                <Text style={styles.resultStatValue}>{s.value}</Text>
                <Text style={styles.resultStatLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.resultActions}>
            <PrimaryButton title={t.results.retry} onPress={handleRetry} />
            <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.homeBtn}>
              <Text style={styles.homeBtnText}>{t.results.home}</Text>
            </TouchableOpacity>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Question
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
      </View>

      <View style={[styles.topBar, { flexDirection }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.qCounter}>{lessonTitle}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.questionScroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={[
          styles.questionCard,
          { transform: [{ translateY: cardAnim }, { translateX: shakeAnim }] }
        ]}>
          <Text style={[styles.questionText, isRTL && styles.rtlText]}>{question.text}</Text>
          {question.image ? (
            <Image source={{ uri: question.image }} style={styles.questionImage} resizeMode="cover" />
          ) : null}
        </Animated.View>

        <View style={styles.optionsContainer}>
          {(question.question_type === 'mcq' || question.question_type === 'image') &&
            Array.isArray(question.options) &&
            question.options.map((opt, i) => (
              <OptionButton key={i} index={i} text={opt}
                state={getOptionState(opt)} onPress={() => handleAnswer(opt)} />
            ))
          }
          {question.question_type === 'ordering' && (
            <OrderingExercise
              steps={question.options.steps}
              disabled={state !== STATE.QUESTION}
              onSubmit={handleOrderingSubmit}
            />
          )}
          {question.question_type === 'fill_blank' && (
            <FillBlankExercise
              sentence={question.options.sentence}
              wordBank={question.options.word_bank}
              disabled={state !== STATE.QUESTION}
              onSubmit={handleFillBlankSubmit}
            />
          )}
          {question.question_type === 'matching' && pairs.length > 0 && (
            <View>
              <Text style={[styles.matchHint, isRTL && styles.rtlText]}>{t.quiz.matchingHint}</Text>
              <View style={[styles.matchWrap, { flexDirection }]}>
                <View style={styles.matchCol}>
                  {pairs.map((p, i) => (
                    <TouchableOpacity key={i} activeOpacity={0.8}
                      style={[styles.matchChip,
                        matchSel === i && styles.matchChipSel,
                        matched[i] && styles.matchChipDone]}
                      onPress={() => handleMatchLeft(i)}>
                      <Text style={[styles.matchChipText, matched[i] && styles.matchChipTextDone]}>
                        {p[0]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.matchCol}>
                  {rightOrder.map((ri) => (
                    <TouchableOpacity key={ri} activeOpacity={0.8}
                      style={[styles.matchChip, styles.matchChipRight,
                        matched[ri] && styles.matchChipDone,
                        wrongFlash === ri && styles.matchChipWrong]}
                      onPress={() => handleMatchRight(ri)}>
                      <Text style={[styles.matchChipText, matched[ri] && styles.matchChipTextDone]}>
                        {pairs[ri][1]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}
          {question.question_type === 'video' && (
            <View style={styles.videoBlock}>
              <View style={styles.videoThumb}>
                <View style={styles.videoPlayCircle}><Text style={styles.videoPlayIcon}>▶</Text></View>
              </View>
              <PrimaryButton title={t.quiz.watchVideo}
                onPress={() => question.options?.url && Linking.openURL(question.options.url)} />
              <TouchableOpacity onPress={handleVideoDone} style={styles.videoDoneBtn}>
                <Text style={styles.videoDoneText}>{t.quiz.continue}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {state === STATE.FEEDBACK && (
          <Animated.View style={[
            styles.feedbackPanel,
            isCorrect ? styles.feedbackCorrect : styles.feedbackWrong,
            { opacity: feedbackAnim, transform: [{ translateY: feedbackAnim.interpolate({ inputRange: [0,1], outputRange: [20, 0] }) }] }
          ]}>
            <Text style={[styles.feedbackTitle, { color: isCorrect ? colors.correct : colors.wrong }, isRTL && styles.rtlText]}>
              {isCorrect ? t.quiz.correct : t.quiz.wrong}
            </Text>
            {question.explanation
              ? <Text style={[styles.feedbackExplanation, isRTL && styles.rtlText]}>{question.explanation}</Text>
              : null}
            <PrimaryButton
              title={t.quiz.continue}
              onPress={advance}
              style={{ backgroundColor: isCorrect ? colors.correct : colors.wrong }}
            />
          </Animated.View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: colors.bg },
  loader:         { flex: 1, marginTop: 80 },
  progressTrack:  { height: 5, backgroundColor: colors.neutral },
  progressFill:   { height: '100%', backgroundColor: colors.gold, borderRadius: 99 },
  topBar:         { alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: 12 },
  closeBtn:       { padding: 8 },
  closeBtnText:   { fontSize: 16, color: colors.textMuted, fontWeight: '700' },
  qCounter:       { fontSize: 14, fontWeight: '700', color: colors.textMuted },
  questionScroll: { paddingHorizontal: spacing.md, paddingTop: 8 },
  questionCard: {
    backgroundColor: colors.card, borderRadius: radius.xl,
    padding: spacing.lg, marginBottom: spacing.md, ...shadow.md,
    borderLeftWidth: 4, borderLeftColor: colors.primary,
  },
  questionText:  { fontSize: 20, fontFamily: fonts.heading, color: colors.text, lineHeight: 30, fontWeight: '700' },
  questionImage: { width: '100%', aspectRatio: 16 / 10, borderRadius: radius.md, marginTop: 14, backgroundColor: colors.neutral },
  rtlText:       { textAlign: 'right' },
  optionsContainer: { gap: 2 },
  matchHint:     { fontSize: 12, color: colors.textMuted, fontWeight: '600', marginBottom: 10, textAlign: 'center' },
  matchWrap:     { gap: 10 },
  matchCol:      { flex: 1, gap: 8 },
  matchChip: {
    backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.neutral,
    paddingVertical: 14, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', minHeight: 52,
  },
  matchChipRight:    { backgroundColor: colors.goldPale, borderColor: colors.goldLight },
  matchChipSel:      { borderColor: colors.gold, borderWidth: 2, ...shadow.sm },
  matchChipDone:     { backgroundColor: colors.correctBg, borderColor: colors.correct },
  matchChipWrong:    { backgroundColor: colors.wrongBg, borderColor: colors.wrong },
  matchChipText:     { fontSize: 13, fontWeight: '700', color: colors.text, textAlign: 'center' },
  matchChipTextDone: { color: colors.correct },
  videoBlock:    { gap: 12 },
  videoThumb: {
    aspectRatio: 16 / 9, borderRadius: radius.lg, backgroundColor: colors.primaryDark,
    alignItems: 'center', justifyContent: 'center', ...shadow.md,
  },
  videoPlayCircle: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.gold,
    alignItems: 'center', justifyContent: 'center', paddingLeft: 4,
  },
  videoPlayIcon: { fontSize: 22, color: colors.white, fontWeight: '900' },
  videoDoneBtn: {
    backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.primary,
    paddingVertical: 14, alignItems: 'center',
  },
  videoDoneText: { fontSize: 15, fontWeight: '700', color: colors.primary },
  feedbackPanel:    { borderRadius: radius.xl, padding: spacing.lg, marginTop: spacing.md, ...shadow.lg },
  feedbackCorrect:  { backgroundColor: colors.correctBg, borderWidth: 1.5, borderColor: colors.correct },
  feedbackWrong:    { backgroundColor: colors.wrongBg,   borderWidth: 1.5, borderColor: colors.wrong },
  feedbackTitle:    { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  feedbackExplanation: { fontSize: 14, color: colors.text, lineHeight: 21, marginBottom: spacing.md, fontStyle: 'italic' },
  introScroll:   { flexGrow: 1, padding: spacing.lg, justifyContent: 'center', gap: spacing.lg },
  introCard: {
    backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.lg,
    ...shadow.md, borderLeftWidth: 4, borderLeftColor: colors.gold, gap: spacing.md,
  },
  introTitle: { fontSize: 22, fontFamily: fonts.heading, fontWeight: '800', color: colors.primary },
  introText:  { fontSize: 16, lineHeight: 24, color: colors.text },
  introImage: { width: '100%', aspectRatio: 16 / 10, borderRadius: radius.md, backgroundColor: colors.neutral },
  introVideo: {
    aspectRatio: 16 / 9, borderRadius: radius.lg, backgroundColor: colors.primaryDark,
    alignItems: 'center', justifyContent: 'center',
  },
  introVideoIcon: { fontSize: 32, color: colors.gold },
  resultScroll:     { alignItems: 'center', paddingTop: 32, paddingHorizontal: spacing.lg },
  trophyCircle:     { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.goldPale, alignItems: 'center', justifyContent: 'center', marginBottom: 16, ...shadow.md, borderWidth: 2, borderColor: colors.goldLight },
  trophyEmoji:      { fontSize: 52 },
  resultTitle:      { fontSize: 30, fontFamily: fonts.heading, fontWeight: '800', color: colors.primary, marginBottom: 4 },
  resultSubtitle:   { fontSize: 15, color: colors.textMuted, marginBottom: 28 },
  resultStats:      { flexDirection: 'row', gap: 12, width: '100%', marginBottom: 28 },
  resultStat:       { flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, alignItems: 'center', paddingVertical: 16, ...shadow.sm },
  resultStatValue:  { fontSize: 22, fontWeight: '900', color: colors.text, marginBottom: 4 },
  resultStatLabel:  { fontSize: 11, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase' },
  resultActions:    { width: '100%', gap: 10 },
  homeBtn:          { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.primary, paddingVertical: 14, alignItems: 'center' },
  homeBtnText:      { fontSize: 16, fontWeight: '700', color: colors.primary },
});
```

- [ ] **Step 2: Delete the old screen**

Run: `git rm faqih-frontend/src/screens/QuizScreen.js`

- [ ] **Step 3: Manual verification**

Deferred to Task 14's manual verification step — `LessonScreen` isn't reachable until `HomeScreen`/`App.js` navigate to it.

- [ ] **Step 4: Commit**

```bash
git add faqih-frontend/src/screens/LessonScreen.js
git commit -m "feat: replace QuizScreen with LessonScreen (intro + mistake-queue + ordering/fill_blank)"
```

---

### Task 14: Frontend — Home screen path map

**Files:**
- Modify: `faqih-frontend/src/screens/HomeScreen.js`

**Interfaces:**
- Consumes: `getCategories()` (units now expose `lesson_count`, not `question_count`), `getUnit(id)` (Task 10, returns `lessons` summaries).
- Produces: tapping a lesson node navigates to `navigation.navigate('Lesson', { lessonId, lessonTitle })` — the route Task 15 wires up in `App.js`.

- [ ] **Step 1: Rewrite the categories/units/lessons rendering**

`HomeScreen.js` currently renders `category.units` directly as tappable rows (lines 89-132). Replace that block so it fetches each unit's lessons and renders a winding path of lesson nodes per unit, with a checkpoint node closing out each unit. Replace the whole file:

```javascript
// src/screens/HomeScreen.js

import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Animated, ActivityIndicator,
  StatusBar, SafeAreaView,
} from 'react-native';
import { getCategories, getUnit } from '../API';
import { colors, radius, shadow, spacing, fonts } from '../theme';
import { PatternDots, XPBar, getCategoryStyle } from '../components/CustomButton';
import LanguagePicker from '../components/LanguagePicker';
import { useLang, useRTL } from '../i18n';

const USER = { name: 'Kullanıcı', xp: 340, xpMax: 500, streak: 7, completedLessons: [1] };

export default function HomeScreen({ navigation }) {
  const { t }                    = useLang();
  const { isRTL, flexDirection } = useRTL();
  const [categories, setCategories] = useState([]);
  const [unitsById, setUnitsById]    = useState({});
  const [loading, setLoading]       = useState(true);
  const [langOpen, setLangOpen]     = useState(false);
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    setLoading(true);
    fadeAnim.setValue(0);
    slideAnim.setValue(24);
    getCategories().then(async (data) => {
      setCategories(data);
      const allUnits = data.flatMap(c => c.units);
      const details = await Promise.all(allUnits.map(u => getUnit(u.id)));
      const byId = {};
      details.forEach(u => { if (u) byId[u.id] = u; });
      setUnitsById(byId);
      setLoading(false);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    });
  }, [t.lang]);

  const startLesson = (lesson) =>
    navigation.navigate('Lesson', { lessonId: lesson.id, lessonTitle: lesson.title });

  // Flattens every unit's lessons in category order, so "is the previous lesson
  // done" can be checked with a single global index — this is the whole unlock
  // rule (see docs/superpowers/specs/2026-08-05-curriculum-lesson-model-design.md,
  // section 2): sequential underneath, path-shaped on screen.
  const allLessonsInOrder = categories.flatMap(cat =>
    cat.units.flatMap(u => (unitsById[u.id]?.lessons ?? []))
  );

  const lessonNodeState = (lesson) => {
    const globalIndex = allLessonsInOrder.findIndex(l => l.id === lesson.id);
    if (USER.completedLessons.includes(lesson.id)) return 'done';
    if (globalIndex <= 0) return 'next';
    const previous = allLessonsInOrder[globalIndex - 1];
    return USER.completedLessons.includes(previous.id) ? 'next' : 'locked';
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />
      <LanguagePicker visible={langOpen} onClose={() => setLangOpen(false)} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <PatternDots style={styles.patternTL} />
          <PatternDots style={styles.patternBR} />

          <View style={[styles.headerTop, { flexDirection }]}>
            <View>
              <Text style={[styles.greeting, isRTL && styles.rtlText]}>{t.home.greeting}</Text>
              <Text style={[styles.userName,  isRTL && styles.rtlText]}>{USER.name}</Text>
            </View>
            <View style={[styles.headerIcons, { flexDirection }]}>
              <TouchableOpacity onPress={() => setLangOpen(true)} style={styles.langBtn}>
                <Text style={styles.langBtnText}>{t.langFlag}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('Profile')}
                style={styles.avatarBtn}
              >
                <Text style={styles.avatarText}>{USER.name.charAt(0).toUpperCase()}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.statsRow, { flexDirection }]}>
            <View style={[styles.streakBadge, { flexDirection }]}>
              <Text style={styles.streakIcon}>🔥</Text>
              <Text style={styles.streakText}>{USER.streak} {t.home.streak}</Text>
            </View>
            <View style={styles.xpWrapper}>
              <XPBar current={USER.xp} max={USER.xpMax} />
            </View>
          </View>
        </View>

        {/* Path */}
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
        ) : (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {categories.map((category, catIdx) => {
              const cs = getCategoryStyle(catIdx);
              return (
                <View key={category.id} style={styles.categoryBlock}>
                  <View style={[styles.categoryHeader, { backgroundColor: cs.bg, flexDirection }]}>
                    <Text style={styles.categoryIcon}>{cs.icon}</Text>
                    <Text style={[styles.categoryTitle, { color: cs.text }]}>{category.title}</Text>
                  </View>

                  {category.units.map((unit) => {
                    const lessons = unitsById[unit.id]?.lessons ?? [];
                    return (
                      <View key={unit.id} style={styles.unitBlock}>
                        <Text style={[styles.unitLabel, isRTL && styles.rtlText]}>{unit.title}</Text>
                        <View style={styles.path}>
                          {lessons.map((lesson, i) => {
                            const nodeState = lessonNodeState(lesson);
                            const offset = i % 2 === 0 ? 0 : 28;
                            return (
                              <TouchableOpacity
                                key={lesson.id}
                                disabled={nodeState === 'locked'}
                                onPress={() => startLesson(lesson)}
                                activeOpacity={0.85}
                                style={[
                                  styles.node,
                                  { marginLeft: isRTL ? 0 : offset, marginRight: isRTL ? offset : 0 },
                                  nodeState === 'done'   && styles.nodeDone,
                                  nodeState === 'locked' && styles.nodeLocked,
                                ]}
                              >
                                <Text style={styles.nodeIcon}>
                                  {nodeState === 'locked' ? '🔒' : nodeState === 'done' ? '⭐' : '📖'}
                                </Text>
                                <Text style={[styles.nodeTitle, nodeState === 'locked' && styles.nodeTitleLocked]} numberOfLines={2}>
                                  {lesson.title}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                          {lessons.length > 0 && (
                            <View style={[styles.checkpoint, { alignSelf: isRTL ? 'flex-start' : 'flex-end' }]}>
                              <Text style={styles.checkpointText}>🏁</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            })}
            <View style={{ height: 32 }} />
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1 },
  header: {
    backgroundColor: colors.primary, paddingTop: 20,
    paddingBottom: 28, paddingHorizontal: spacing.lg, overflow: 'hidden',
  },
  patternTL: { position: 'absolute', top: 12, right: 16, opacity: 0.6 },
  patternBR: { position: 'absolute', bottom: -8, left: 8,  opacity: 0.3 },
  headerTop: { justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting:  { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginBottom: 2 },
  userName:  { fontSize: 22, color: colors.white, fontFamily: fonts.heading, fontWeight: '700' },
  rtlText:   { textAlign: 'right' },
  headerIcons: { alignItems: 'center', gap: 10 },
  langBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center',
  },
  langBtnText: { fontSize: 20 },
  avatarBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', ...shadow.sm,
  },
  avatarText:   { fontSize: 18, fontWeight: '800', color: colors.white },
  statsRow:     { alignItems: 'center', gap: 12 },
  streakBadge:  {
    alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: radius.full,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  streakIcon:    { fontSize: 16 },
  streakText:    { color: colors.white, fontSize: 13, fontWeight: '700' },
  xpWrapper:     { flex: 1 },
  categoryBlock: { marginHorizontal: spacing.md, marginTop: spacing.lg },
  categoryHeader: { alignItems: 'center', paddingVertical: 12, paddingHorizontal: spacing.md, gap: 10, borderRadius: radius.lg, marginBottom: spacing.md },
  categoryIcon:   { fontSize: 20 },
  categoryTitle:  { fontSize: 16, fontFamily: fonts.heading, fontWeight: '700' },
  unitBlock:      { marginBottom: spacing.lg },
  unitLabel:      { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  path:           { gap: 14, alignItems: 'flex-start' },
  node: {
    width: 140, alignItems: 'center', gap: 6,
    backgroundColor: colors.card, borderRadius: radius.lg,
    paddingVertical: 14, paddingHorizontal: 10, ...shadow.sm,
    borderWidth: 1.5, borderColor: colors.neutral,
  },
  nodeDone:        { backgroundColor: '#F5FBF7', borderColor: colors.correct },
  nodeLocked:      { opacity: 0.55 },
  nodeIcon:        { fontSize: 22 },
  nodeTitle:       { fontSize: 12.5, fontWeight: '700', color: colors.text, textAlign: 'center' },
  nodeTitleLocked: { color: colors.textLight },
  checkpoint: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.goldPale,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.goldLight,
  },
  checkpointText: { fontSize: 18 },
});
```

- [ ] **Step 2: Manual verification**

Run: `cd faqih-frontend && npx expo start --web`. Confirm: Home screen loads and shows each category's units with a winding path of lesson nodes; the first lesson is tappable and opens `LessonScreen`; locked nodes (any lesson after an incomplete one) show a lock icon and aren't tappable; completing a lesson's mock-data intro → exercises → results flow works end-to-end for at least one mcq, one ordering, and one fill_blank exercise (use the mock data from Task 10 by temporarily pointing `BASE_URL` at an unreachable host, or by running against the migrated Django backend from Tasks 1-9).

- [ ] **Step 3: Commit**

```bash
git add faqih-frontend/src/screens/HomeScreen.js
git commit -m "feat: render Home screen as a lesson path map with checkpoints"
```

---

### Task 15: i18n keys and navigation wiring

**Files:**
- Modify: `faqih-frontend/src/i18n/tr.js`, `faqih-frontend/src/i18n/en.js`, `faqih-frontend/src/i18n/ar.js`
- Modify: `faqih-frontend/App.js`

**Interfaces:**
- Consumes: nothing new — this task just fills in the copy `LessonScreen`/`HomeScreen` already reference via `t.quiz.continue`, `t.results.*` (unchanged keys, already exist) and registers the `Lesson` route.

- [ ] **Step 1: Update `App.js`**

In `faqih-frontend/App.js`, replace the `QuizScreen` import and route:
```javascript
import LessonScreen  from './src/screens/LessonScreen';
```
```javascript
        <Stack.Screen name="Lesson"  component={LessonScreen}  options={{ headerShown: false }} />
```
(remove the old `import QuizScreen from './src/screens/QuizScreen';` line and the old `Stack.Screen name="Quiz"` line.)

- [ ] **Step 2: Verify no remaining references to the old screen or field names**

Run: `cd faqih-frontend && grep -rn "QuizScreen\|correct_option\|question_count" src App.js`
Expected: no output (everything already migrated in Tasks 10-14; this is a final sweep for anything missed).

- [ ] **Step 3: Confirm existing i18n keys already cover the new screens**

`t.quiz.continue`, `t.quiz.correct`, `t.quiz.wrong`, `t.quiz.matchingHint`, `t.quiz.watchVideo`, `t.results.*` are all reused as-is by `LessonScreen` — no new keys needed for those. The only genuinely new copy is the lesson intro screen, which reuses `t.quiz.continue` for its button (already handled in Task 13). No i18n file edits are required for this sub-project; `en.js`/`ar.js` content completeness is explicitly out of scope (see spec's "Explicitly out of scope" section — that's sub-project 5).

- [ ] **Step 4: Full manual walkthrough**

Run: `cd faqih_backend && python manage.py runserver` in one terminal and `cd faqih-frontend && npx expo start --web` in another. Walk through: Home path map → tap first lesson → (if it has an intro) tap through it → answer every exercise type at least once, including deliberately answering one wrong to confirm it resurfaces later in the same lesson → reach the results screen → tap "Ana Menü" → confirm the completed lesson's node updates (per `USER.completedLessons` mock — note this is still mock/local state, real persistence is sub-project 2).

- [ ] **Step 5: Commit**

```bash
git add faqih-frontend/App.js
git commit -m "feat: wire LessonScreen into navigation, remove QuizScreen references"
```

---

## Self-Review Notes

- **Spec coverage**: every section of `docs/superpowers/specs/2026-08-05-curriculum-lesson-model-design.md` maps to a task — data model (Tasks 1-3), unlock/path map (Task 14), session flow/mistake-queue (Tasks 11 & 13), API/panel (Tasks 5-6, 8-9), error handling (built into the panel validation in Tasks 8-9 and the existing API-failure fallback reused as-is in Task 10), migration (Task 2), testing (Tasks 6-7 backend, Task 11 frontend).
- **Placeholder scan**: no TBD/TODO; every step has runnable commands and complete code, not descriptions.
- **Type/name consistency checked**: `correct_answer` (not `correct_option`) is used consistently from Task 3 onward through serializers, panel, and frontend; `question_type` (not renamed) is used consistently everywhere; `getLesson`/`createSession`/`answerCurrent`/`OrderingExercise`/`FillBlankExercise` signatures match between the task that defines them and every task that consumes them.
- **Explicitly deferred** (matches the spec's "out of scope" list, not dropped by oversight): accounts/persistence, gamification, mascots, true branching, checkpoint review lessons, resume-mid-lesson, EN/AR content, the legacy `hotspot` type.
