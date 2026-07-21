from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategoryViewSet, UnitViewSet, QuestionViewSet, question_image

router = DefaultRouter()
router.register(r'categories', CategoryViewSet)
router.register(r'units', UnitViewSet)
router.register(r'questions', QuestionViewSet)

urlpatterns = [
    path('media/soru/<int:pk>/', question_image, name='question_image'),
    path('', include(router.urls)),
]
