# content/models.py
from django.db import models
import json

class Category(models.Model):
    title = models.CharField(max_length=100, verbose_name="Kategori Başlığı")
    description = models.TextField(blank=True, verbose_name="Açıklama")
    image_url = models.URLField(blank=True, null=True, verbose_name="Kapak Resmi URL")

    def __str__(self):
        return self.title

class Unit(models.Model):
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='units')
    title = models.CharField(max_length=150, verbose_name="Ünite Başlığı")
    order = models.PositiveIntegerField(default=1, verbose_name="Sıralama")

    def __str__(self):
        return f"{self.title}"

class Question(models.Model):
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE, related_name='questions')
    text = models.CharField(max_length=500, verbose_name="Soru Metni")
    
    # Soru Tipi Seçenekleri
    QUESTION_TYPES = [
        ('multiple_choice', 'Klasik Çoktan Seçmeli'),
        ('image_selection', 'Resim Seçmeli (Su Çeşitleri)'), 
        ('hotspot', 'Vücut Üzerinde Seçim (Abdest)'), # YENİ TİP
    ]
    question_type = models.CharField(
        max_length=20, 
        choices=QUESTION_TYPES, 
        default='multiple_choice',
        verbose_name="Soru Tipi"
    )

    # ESNEK ŞIKLAR (JSON FORMATINDA)
    options_json = models.TextField(
        verbose_name="Şıklar (JSON)", 
        help_text='Örn: [{"id": "A", "text": "Su", "image": "url"}]',
        default='[]' 
    )
    
    correct_option = models.CharField(max_length=10, verbose_name="Doğru Cevap ID'si (Örn: A)")
    
    explanation = models.TextField(blank=True, verbose_name="Hâkim'in Açıklaması")

    def __str__(self):
        return self.text