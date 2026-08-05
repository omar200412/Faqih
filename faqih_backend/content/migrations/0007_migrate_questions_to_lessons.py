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
