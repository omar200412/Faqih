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


QUESTION_TYPES = [
    ('mcq',     'Çoktan Seçmeli'),
    ('hotspot', 'Hotspot (Resim Üzeri)'),
]

class Question(models.Model):
    unit          = models.ForeignKey(
        Unit, on_delete=models.CASCADE,
        related_name='questions', verbose_name='Ünite'
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

    class Meta:
        verbose_name        = 'Soru'
        verbose_name_plural = 'Sorular'
        ordering            = ['id']

    def __str__(self):
        return f'[{self.unit.title}] {self.text[:50]}'