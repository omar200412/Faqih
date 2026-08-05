# content/models.py

from django.db import models


class Category(models.Model):
    title = models.CharField(max_length=200, verbose_name='Kategori Adı')

    class Meta:
        verbose_name        = 'Kategori'
        verbose_name_plural = 'Kategoriler'
        ordering            = ['id']

    def __str__(self):
        return self.title


class Unit(models.Model):
    category = models.ForeignKey(
        Category, on_delete=models.CASCADE,
        related_name='units', verbose_name='Kategori'
    )
    title = models.CharField(max_length=200, verbose_name='Ünite Adı')

    class Meta:
        verbose_name        = 'Ünite'
        verbose_name_plural = 'Üniteler'
        ordering            = ['id']

    def __str__(self):
        return f'{self.category.title} → {self.title}'


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


QUESTION_TYPES = [
    ('mcq',        'Çoktan Seçmeli'),
    ('true_false', 'Doğru / Yanlış'),
    ('matching',   'Eşleştirme'),
    ('image',      'Resimli Soru'),
    ('video',      'Video Ders'),
    ('hotspot',    'Hotspot (Resim Üzeri)'),
]

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
        max_length=20, choices=QUESTION_TYPES,
        default='mcq', verbose_name='Soru Türü'
    )
    text          = models.TextField(verbose_name='Soru Metni')
    options_json  = models.TextField(
        verbose_name='Seçenekler (JSON)',
        help_text='MCQ: ["A", "B", "C", "D"]  |  Hotspot: {"background_image": "...", "hotspots": [...]}'
    )
    correct_option = models.CharField(max_length=200, verbose_name='Doğru Cevap')
    explanation    = models.TextField(blank=True, verbose_name='Açıklama')
    # Resimli sorular için görsel veritabanında saklanır (Render diski kalıcı değil)
    image_data     = models.BinaryField(null=True, blank=True, editable=False)
    image_mime     = models.CharField(max_length=50, blank=True, default='')

    class Meta:
        verbose_name        = 'Soru'
        verbose_name_plural = 'Sorular'
        ordering            = ['id']

    def __str__(self):
        return f'[{self.unit.title}] {self.text[:50]}'