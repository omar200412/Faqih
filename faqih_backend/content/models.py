# content/models.py

from django.db import models
from django.utils import timezone
from datetime import timedelta


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