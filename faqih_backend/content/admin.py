from django.contrib import admin
from django.utils.html import format_html
from .models import Category, Unit, Question
import json

# ── Inline Tanımlamaları ────────────────────────────────
class QuestionInline(admin.StackedInline):
    model = Question
    extra = 1
    fields = ('question_type', 'text', 'options_json', 'correct_option', 'explanation')
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
    list_display = ('id', 'title', 'category', 'question_count')
    list_filter = ('category',)
    search_fields = ('title',)
    inlines = [QuestionInline]

    def question_count(self, obj):
        return obj.questions.count()
    question_count.short_description = 'Soru Sayısı'

QUESTION_TYPE_LABELS = {
    'mcq': '❓ Çoktan Seçmeli',
    'hotspot': '🗺️ Hotspot',
}

@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ('id', 'short_text', 'question_type_badge', 'unit', 'correct_option')
    list_filter = ('question_type', 'unit__category')
    search_fields = ('text',)
    readonly_fields = ('options_preview',)

    fieldsets = (
        ('Soru', {
            'fields': ('unit', 'question_type', 'text')
        }),
        ('Cevaplar', {
            'fields': ('options_json', 'options_preview', 'correct_option'),
            'description': (
                'MCQ için options_json şöyle olmalı: ["Seçenek A", "Seçenek B", "Seçenek C", "Seçenek D"]\n'
                'Hotspot için: {"background_image": "URL", "hotspots": [{"id": "A", "text": "...", "style": {}}]}'
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
        label = QUESTION_TYPE_LABELS.get(obj.question_type, obj.question_type)
        colors = {'mcq': '#1A5C38', 'hotspot': '#C9993A'}
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
        except Exception:
            pass
        return 'Geçersiz JSON formatı'
    options_preview.short_description = 'Seçenekler (Önizleme)'

# ── Admin site başlıkları ─────────────────────────────────────────────────────
admin.site.site_header  = '🕌 Faqih Admin Paneli'
admin.site.site_title   = 'Faqih'
admin.site.index_title  = 'İçerik Yönetimi'