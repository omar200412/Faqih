from django.contrib import admin
from django.utils.html import format_html
from .models import Category, Unit, Lesson, Exercise
import json

# ── Inline Tanımlamaları ────────────────────────────────
class ExerciseInline(admin.StackedInline):
    model = Exercise
    extra = 1
    fields = ('question_type', 'text', 'options_json', 'correct_answer', 'explanation')
    show_change_link = True

class LessonInline(admin.TabularInline):
    model = Lesson
    extra = 1
    fields = ('title', 'intro_kind')
    show_change_link = True

class UnitInline(admin.TabularInline):
    model = Unit
    extra = 1
    fields = ('title',)
    show_change_link = True

# ── Admin Sınıfları ────────────────────────────────────────────
@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'unit_count')
    search_fields = ('title',)
    inlines = [UnitInline]

    def unit_count(self, obj):
        return obj.units.count()
    unit_count.short_description = 'Ünite Sayısı'

@admin.register(Unit)
class UnitAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'category', 'lesson_count')
    list_filter = ('category',)
    search_fields = ('title',)
    inlines = [LessonInline]

    def lesson_count(self, obj):
        return obj.lessons.count()
    lesson_count.short_description = 'Ders Sayısı'

@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'unit', 'intro_kind', 'exercise_count')
    list_filter = ('unit__category', 'intro_kind')
    search_fields = ('title',)
    inlines = [ExerciseInline]

    def exercise_count(self, obj):
        return obj.exercises.count()
    exercise_count.short_description = 'Alıştırma Sayısı'

EXERCISE_TYPE_LABELS = {
    'mcq': '❓ Çoktan Seçmeli',
    'ordering': '🔢 Sıralama',
    'fill_blank': '✏️ Boşluk Doldurma',
    'hotspot': '🗺️ Hotspot',
}

@admin.register(Exercise)
class ExerciseAdmin(admin.ModelAdmin):
    list_display = ('id', 'short_text', 'question_type_badge', 'lesson', 'correct_answer')
    list_filter = ('question_type', 'lesson__unit__category')
    search_fields = ('text',)
    readonly_fields = ('options_preview',)

    fieldsets = (
        ('Soru', {
            'fields': ('lesson', 'question_type', 'text')
        }),
        ('Cevaplar', {
            'fields': ('options_json', 'options_preview', 'correct_answer'),
            'description': (
                'MCQ için options_json şöyle olmalı: ["Seçenek A", "Seçenek B", "Seçenek C", "Seçenek D"]\n'
                'Hotspot için: {"background_image": "URL", "hotspots": [{"id": "A", "text": "...", "style": {}}]}\n'
                'Sıralama için: {"steps": ["1. adım", "2. adım", ...]} (doğru sırada)\n'
                'Boşluk Doldurma için: {"sentence": "... ___ ...", "word_bank": ["kelime1", "kelime2"]}'
            ),
        }),
        ('Açıklama', {
            'fields': ('explanation',),
        }),
    )

    def short_text(self, obj):
        if obj.text:
            return obj.text[:60] + '...' if len(obj.text) > 60 else obj.text
        return "-"
    short_text.short_description = 'Soru'

    def question_type_badge(self, obj):
        label = EXERCISE_TYPE_LABELS.get(obj.question_type, obj.question_type)
        colors = {'mcq': '#1A5C38', 'ordering': '#8A6620', 'fill_blank': '#2C5F8A', 'hotspot': '#C9993A'}
        color = colors.get(obj.question_type, '#555')
        return format_html(
            '<span style="background:{};color:#fff;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:700">{}</span>',
            color, label
        )
    question_type_badge.short_description = 'Tür'

    def options_preview(self, obj):
        if not obj.options_json:
            return '—'
        try:
            data = json.loads(obj.options_json)
            if isinstance(data, list):
                items = ''.join(f'<li style="padding:4px 0"><b>{chr(65+i)})</b> {opt}</li>' for i, opt in enumerate(data))
                return format_html('<ul style="margin:0;padding-left:16px">{}</ul>', items)
            elif isinstance(data, dict) and 'hotspots' in data:
                hotspots = data['hotspots']
                items = ''.join(f'<li><b>{h.get("id", "")}</b> — {h.get("text", "")}</li>' for h in hotspots)
                return format_html(
                    '<p>🖼️ <a href="{}" target="_blank">Resmi Görüntüle</a></p><ul>{}</ul>',
                    data.get('background_image', '#'), items
                )
            elif isinstance(data, dict) and 'steps' in data:
                items = ''.join(f'<li style="padding:4px 0">{i+1}. {s}</li>' for i, s in enumerate(data['steps']))
                return format_html('<ol style="margin:0;padding-left:16px">{}</ol>', items)
            elif isinstance(data, dict) and 'sentence' in data:
                bank = ', '.join(data.get('word_bank', []))
                return format_html('<p>{}</p><p>🗃️ Kelime havuzu: {}</p>', data['sentence'], bank)
        except Exception:
            pass
        return 'Geçersiz JSON formatı'
    options_preview.short_description = 'Seçenekler (Önizleme)'

# ── Admin site başlıkları ─────────────────────────────────────────────────────
admin.site.site_header  = '🕌 Faqih Admin Paneli'
admin.site.site_title   = 'Faqih'
admin.site.index_title  = 'İçerik Yönetimi'
