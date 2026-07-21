from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0003_alter_category_options_alter_question_options_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='question',
            name='question_type',
            field=models.CharField(
                choices=[
                    ('mcq', 'Çoktan Seçmeli'),
                    ('true_false', 'Doğru / Yanlış'),
                    ('matching', 'Eşleştirme'),
                    ('image', 'Resimli Soru'),
                    ('video', 'Video Ders'),
                    ('hotspot', 'Hotspot (Resim Üzeri)'),
                ],
                default='mcq',
                max_length=20,
                verbose_name='Soru Türü',
            ),
        ),
    ]
