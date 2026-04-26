from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategoryViewSet, UnitViewSet, QuestionViewSet

router = DefaultRouter()
router.register(r'categories', CategoryViewSet)
router.register(r'units', UnitViewSet)
router.register(r'questions', QuestionViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
