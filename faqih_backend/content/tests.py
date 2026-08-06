from datetime import timedelta
from django.test import TestCase, TransactionTestCase
from django.db.migrations.executor import MigrationExecutor
from django.db import connection
from django.utils import timezone
from .models import Category, Unit, Lesson


class LessonModelTests(TestCase):
    def test_lesson_belongs_to_unit_and_defaults_to_no_intro(self):
        category = Category.objects.create(title='Namaz')
        unit = Unit.objects.create(category=category, title='Namaz Vakitleri')
        lesson = Lesson.objects.create(unit=unit, title='Vakitlerin Girişi')

        self.assertEqual(lesson.unit, unit)
        self.assertEqual(lesson.intro_kind, 'none')
        self.assertIn(lesson, unit.lessons.all())


class LessonBackfillMigrationTests(TransactionTestCase):
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


class ExerciseModelTests(TestCase):
    def test_exercise_has_no_unit_field_and_supports_new_types(self):
        from .models import Exercise, EXERCISE_TYPES

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

    def test_legacy_multiple_choice_and_true_false_are_normalized_to_mcq_on_the_wire(self):
        from .models import Exercise
        from .serializers import ExerciseSerializer

        category = Category.objects.create(title='Namaz')
        unit = Unit.objects.create(category=category, title='Namaz Vakitleri')
        lesson = Lesson.objects.create(unit=unit, title='Kıyam')

        legacy_mcq = Exercise.objects.create(
            lesson=lesson, question_type='multiple_choice',
            text='Ayakta durmaya ne ad verilir?',
            options_json='["Rükû", "Kıyam"]', correct_answer='Kıyam',
        )
        legacy_tf = Exercise.objects.create(
            lesson=lesson, question_type='true_false',
            text='Kıyam ayakta durmaktır.',
            options_json='["Doğru", "Yanlış"]', correct_answer='Doğru',
        )

        self.assertEqual(ExerciseSerializer(legacy_mcq).data['question_type'], 'mcq')
        self.assertEqual(ExerciseSerializer(legacy_tf).data['question_type'], 'mcq')


class SerializerNestingTests(TestCase):
    def setUp(self):
        from .models import Exercise
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
        from .serializers import CategorySerializer
        data = CategorySerializer(self.category).data
        self.assertEqual(data['units'][0]['lesson_count'], 1)
        self.assertNotIn('lessons', data['units'][0])

    def test_unit_serializer_exposes_lesson_summaries(self):
        from .serializers import UnitSerializer
        data = UnitSerializer(self.unit).data
        self.assertEqual(len(data['lessons']), 1)
        self.assertEqual(data['lessons'][0]['title'], 'Vakitler')
        self.assertTrue(data['lessons'][0]['has_intro'])
        self.assertNotIn('exercises', data['lessons'][0])

    def test_lesson_serializer_exposes_intro_and_exercises(self):
        from .serializers import LessonSerializer
        data = LessonSerializer(self.lesson).data
        self.assertEqual(data['intro'], {'kind': 'text', 'body': 'Namaz vakitleri güneşin konumuna göre belirlenir.'})
        self.assertEqual(len(data['exercises']), 1)
        exercise = data['exercises'][0]
        self.assertEqual(exercise['question_type'], 'fill_blank')
        self.assertEqual(exercise['correct_answer'], 'beş')
        self.assertEqual(exercise['options']['sentence'], 'Günde ___ vakit namaz kılınır.')


class LessonApiTests(TestCase):
    def setUp(self):
        from rest_framework.test import APIClient
        from .models import Exercise
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


class NewExerciseTypeApiTests(TestCase):
    def setUp(self):
        from rest_framework.test import APIClient
        self.client = APIClient()
        category = Category.objects.create(title='Temizlik')
        unit = Unit.objects.create(category=category, title='Abdest')
        self.lesson = Lesson.objects.create(unit=unit, title='Abdest Adımları')

    def test_ordering_exercise_round_trips_steps_in_order(self):
        from .models import Exercise
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
        from .models import Exercise
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
        p = UserProgress.objects.get(device_id='poor-device')
        self.assertEqual(p.hearts, 0)
        self.assertEqual(p.gems, 10)
