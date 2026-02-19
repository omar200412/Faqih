from rest_framework import serializers
from .models import Category, Unit, Question
import json

class QuestionSerializer(serializers.ModelSerializer):
    options = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = ['id', 'text', 'question_type', 'options', 'correct_option', 'explanation']

    def get_options(self, obj):
        # Veritabanındaki metni (string) gerçek JSON objesine çevirip gönderir
        try:
            return json.loads(obj.options_json)
        except:
            return []

class UnitSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)
    
    class Meta:
        model = Unit
        fields = ['id', 'title', 'order', 'questions']

class CategorySerializer(serializers.ModelSerializer):
    units = UnitSerializer(many=True, read_only=True)

    class Meta:
        model = Category
        fields = ['id', 'title', 'description', 'image_url', 'units']