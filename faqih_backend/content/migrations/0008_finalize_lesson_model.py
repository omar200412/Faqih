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
