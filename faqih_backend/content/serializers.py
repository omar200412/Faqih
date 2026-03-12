# content/serializers.py

import json
from rest_framework import serializers
from .models import Category, Unit, Question


class QuestionSerializer(serializers.ModelSerializer):
    options = serializers.SerializerMethodField()

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

    def get_options(self, obj):
        """
        Deserialize options_json from raw text into a proper JSON object
        so the frontend receives a parsed structure, not a string.
        """
        try:
            return json.loads(obj.options_json)
        except (TypeError, ValueError):
            return None


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