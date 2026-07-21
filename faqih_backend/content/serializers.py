# content/serializers.py

import json
from rest_framework import serializers
from .models import Category, Unit, Question


class QuestionSerializer(serializers.ModelSerializer):
    question_type = serializers.SerializerMethodField()
    options = serializers.SerializerMethodField()
    correct_option = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = [
            'id',
            'question_type',
            'text',
            'options',
            'correct_option',
            'explanation',
        ]

    def _parsed_options(self, obj):
        try:
            return json.loads(obj.options_json)
        except (TypeError, ValueError):
            return None

    def get_question_type(self, obj):
        # Eski kayıtlarda 'multiple_choice' kullanılmış; uygulama 'mcq' bekliyor.
        # Doğru/Yanlış da uygulamada iki seçenekli mcq olarak gösterilir.
        if obj.question_type in ('multiple_choice', 'true_false'):
            return 'mcq'
        return obj.question_type

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

    def get_correct_option(self, obj):
        data = self._parsed_options(obj)
        # Eski formatta correct_option seçenek id'siydi ("D") — metnine çevir
        if isinstance(data, list) and data and isinstance(data[0], dict):
            for o in data:
                if o.get('id') == obj.correct_option:
                    return o.get('text') or obj.correct_option
        return obj.correct_option


class UnitSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Unit
        fields = [
            'id',
            'title',
            'questions',
        ]


class UnitSummarySerializer(serializers.ModelSerializer):
    """
    Lightweight unit serializer used inside CategorySerializer —
    does NOT nest questions to keep the category list response small.
    """
    question_count = serializers.SerializerMethodField()

    class Meta:
        model = Unit
        fields = [
            'id',
            'title',
            'question_count',
        ]

    def get_question_count(self, obj):
        return obj.questions.count()


class CategorySerializer(serializers.ModelSerializer):
    units = UnitSummarySerializer(many=True, read_only=True)

    class Meta:
        model = Category
        fields = [
            'id',
            'title',
            'units',
        ]