from django.test import TestCase
from .models import Category, Unit, Lesson


class LessonModelTests(TestCase):
    def test_lesson_belongs_to_unit_and_defaults_to_no_intro(self):
        category = Category.objects.create(title='Namaz')
        unit = Unit.objects.create(category=category, title='Namaz Vakitleri')
        lesson = Lesson.objects.create(unit=unit, title='Vakitlerin Girişi')

        self.assertEqual(lesson.unit, unit)
        self.assertEqual(lesson.intro_kind, 'none')
        self.assertIn(lesson, unit.lessons.all())
