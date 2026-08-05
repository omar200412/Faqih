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
