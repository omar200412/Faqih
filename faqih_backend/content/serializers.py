# content/serializers.py

import json
from rest_framework import serializers
from .models import Category, Unit, Lesson, Exercise


class ExerciseSerializer(serializers.ModelSerializer):
    question_type = serializers.SerializerMethodField()
    options = serializers.SerializerMethodField()
    correct_answer = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()

    class Meta:
        model = Exercise
        fields = [
            'id',
            'question_type',
            'text',
            'options',
            'correct_answer',
            'explanation',
            'image',
        ]

    def get_image(self, obj):
        if not obj.image_data:
            return None
        url = '/api/media/soru/%d/' % obj.pk
        request = self.context.get('request')
        return request.build_absolute_uri(url) if request else url

    def get_question_type(self, obj):
        # Eski kayıtlarda 'multiple_choice' kullanılmış; uygulama 'mcq' bekliyor.
        # Doğru/Yanlış da uygulamada iki seçenekli mcq olarak gösterilir.
        if obj.question_type in ('multiple_choice', 'true_false'):
            return 'mcq'
        return obj.question_type

    def _parsed_options(self, obj):
        try:
            return json.loads(obj.options_json)
        except (TypeError, ValueError):
            return None

    def get_options(self, obj):
        """
        Deserialize options_json from raw text into a proper JSON object
        so the frontend receives a parsed structure, not a string.
        Normalizes legacy formats to what the app expects.
        """
        if obj.question_type == 'true_false':
            return ['Doğru', 'Yanlış']
        data = self._parsed_options(obj)
        # Eski format: [{"id": "A", "text": "..."}] → düz metin listesi
        if isinstance(data, list) and data and isinstance(data[0], dict):
            return [o.get('text') or o.get('id', '') for o in data]
        # Hotspot: text alanı yoksa id'yi göster
        if isinstance(data, dict) and isinstance(data.get('hotspots'), list):
            for h in data['hotspots']:
                if isinstance(h, dict) and not h.get('text'):
                    h['text'] = h.get('id', '')
        return data

    def get_correct_answer(self, obj):
        data = self._parsed_options(obj)
        # Eski formatta correct_answer seçenek id'siydi ("D") — metnine çevir
        if isinstance(data, list) and data and isinstance(data[0], dict):
            for o in data:
                if o.get('id') == obj.correct_answer:
                    return o.get('text') or obj.correct_answer
        return obj.correct_answer


class LessonSerializer(serializers.ModelSerializer):
    exercises = ExerciseSerializer(many=True, read_only=True)
    intro = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = [
            'id',
            'title',
            'intro',
            'exercises',
        ]

    def get_intro(self, obj):
        if obj.intro_kind == 'none':
            return None
        if obj.intro_kind == 'text':
            return {'kind': 'text', 'body': obj.intro_text}
        if obj.intro_kind == 'video':
            return {'kind': 'video', 'body': obj.intro_video_url}
        if obj.intro_kind == 'image':
            if not obj.intro_image_data:
                return None
            url = '/api/media/ders-giris/%d/' % obj.pk
            request = self.context.get('request')
            return {'kind': 'image', 'body': request.build_absolute_uri(url) if request else url}
        return None


class LessonSummarySerializer(serializers.ModelSerializer):
    """
    Lightweight lesson serializer used inside UnitSerializer —
    does NOT nest exercises, just enough for the Home screen path map.
    """
    has_intro = serializers.SerializerMethodField()
    exercise_count = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = [
            'id',
            'title',
            'has_intro',
            'exercise_count',
        ]

    def get_has_intro(self, obj):
        return obj.intro_kind != 'none'

    def get_exercise_count(self, obj):
        return obj.exercises.count()


class UnitSerializer(serializers.ModelSerializer):
    lessons = LessonSummarySerializer(many=True, read_only=True)

    class Meta:
        model = Unit
        fields = [
            'id',
            'title',
            'lessons',
        ]


class UnitSummarySerializer(serializers.ModelSerializer):
    """
    Lightweight unit serializer used inside CategorySerializer —
    does NOT nest lessons to keep the category list response small.
    """
    lesson_count = serializers.SerializerMethodField()

    class Meta:
        model = Unit
        fields = [
            'id',
            'title',
            'lesson_count',
        ]

    def get_lesson_count(self, obj):
        return obj.lessons.count()


class CategorySerializer(serializers.ModelSerializer):
    units = UnitSummarySerializer(many=True, read_only=True)

    class Meta:
        model = Category
        fields = [
            'id',
            'title',
            'units',
        ]
