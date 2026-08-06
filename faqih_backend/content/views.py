# content/views.py

from django.http import Http404, HttpResponse
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Category, Unit, Lesson, Exercise, UserProgress, GEMS_PER_LESSON, HEART_REFILL_COST
from .serializers import (
    CategorySerializer, UnitSerializer, LessonSerializer, ExerciseSerializer,
    UserProgressSerializer,
)


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


class UserProgressViewSet(viewsets.ViewSet):
    """
    Anonymous, device-id-keyed progress (hearts/gems/xp).
    Endpoint: /api/progress/<device_id>/
    """

    def _get_or_create(self, device_id):
        obj, _ = UserProgress.objects.get_or_create(device_id=device_id)
        obj.apply_heart_regen()
        obj.save()
        return obj

    def retrieve(self, request, pk=None):
        obj = self._get_or_create(pk)
        return Response(UserProgressSerializer(obj).data)

    @action(detail=True, methods=['post'])
    def answer(self, request, pk=None):
        obj = self._get_or_create(pk)
        if request.data.get('correct'):
            obj.xp += 10
        elif obj.hearts > 0:
            obj.hearts -= 1
            if obj.last_heart_lost_at is None:
                obj.last_heart_lost_at = timezone.now()
        obj.save()
        return Response(UserProgressSerializer(obj).data)

    @action(detail=True, methods=['post'], url_path='complete-lesson')
    def complete_lesson(self, request, pk=None):
        obj = self._get_or_create(pk)
        lesson_id = request.data.get('lesson_id')
        if lesson_id is not None and lesson_id not in obj.completed_lesson_ids:
            obj.completed_lesson_ids.append(lesson_id)
            obj.gems += GEMS_PER_LESSON
            obj.save()
        return Response(UserProgressSerializer(obj).data)
