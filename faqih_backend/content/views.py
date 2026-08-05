# content/views.py

from django.http import Http404, HttpResponse
from rest_framework import viewsets
from .models import Category, Unit, Lesson, Exercise
from .serializers import CategorySerializer, UnitSerializer, LessonSerializer, ExerciseSerializer


def question_image(request, pk):
    """Veritabanında saklanan soru görselini servis eder."""
    try:
        exercise = Exercise.objects.get(pk=pk)
    except Exercise.DoesNotExist:
        raise Http404
    if not exercise.image_data:
        raise Http404
    response = HttpResponse(bytes(exercise.image_data), content_type=exercise.image_mime or 'image/jpeg')
    response['Cache-Control'] = 'public, max-age=86400'
    return response


def lesson_intro_image(request, pk):
    """Veritabanında saklanan ders girişi görselini servis eder."""
    try:
        lesson = Lesson.objects.get(pk=pk)
    except Lesson.DoesNotExist:
        raise Http404
    if not lesson.intro_image_data:
        raise Http404
    response = HttpResponse(bytes(lesson.intro_image_data), content_type=lesson.intro_image_mime or 'image/jpeg')
    response['Cache-Control'] = 'public, max-age=86400'
    return response

class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Tüm kategorileri ve içindeki üniteleri (sadece özet olarak) listeler.
    Mobil uygulamanın ana sayfası burayı çekecek.
    Endpoint: /api/categories/
    """
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

class UnitViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Belirli bir üniteye tıklandığında dersleri (özet) getirir.
    Endpoint: /api/units/
    """
    queryset = Unit.objects.all()
    serializer_class = UnitSerializer

class LessonViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Belirli bir derse tıklandığında girişi ve tüm alıştırmaları getirir.
    Endpoint: /api/lessons/
    """
    queryset = Lesson.objects.all()
    serializer_class = LessonSerializer

class ExerciseViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Tüm alıştırmaları listeler (Gerekirse filtreleme yapılabilir).
    Endpoint: /api/questions/
    """
    queryset = Exercise.objects.all()
    serializer_class = ExerciseSerializer
