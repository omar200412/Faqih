from django.test import TestCase, TransactionTestCase
from django.db.migrations.executor import MigrationExecutor
from django.db import connection
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
