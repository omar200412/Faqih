from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategoryViewSet, UnitViewSet, LessonViewSet, ExerciseViewSet,
    question_image, lesson_intro_image,
)

router = DefaultRouter()
router.register(r'categories', CategoryViewSet)
router.register(r'units', UnitViewSet)
router.register(r'lessons', LessonViewSet)
router.register(r'questions', ExerciseViewSet)

urlpatterns = [
    path('media/soru/<int:pk>/', question_image, name='question_image'),
    path('media/ders-giris/<int:pk>/', lesson_intro_image, name='lesson_intro_image'),
    path('', include(router.urls)),
]
