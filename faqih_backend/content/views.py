# content/views.py

from rest_framework import viewsets
from .models import Category, Unit, Question
from .serializers import CategorySerializer, UnitSerializer, QuestionSerializer

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
    Belirli bir üniteye tıklandığında soruları getirir.
    Endpoint: /api/units/
    """
    queryset = Unit.objects.all()
    serializer_class = UnitSerializer

class QuestionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Tüm soruları listeler (Gerekirse filtreleme yapılabilir).
    Endpoint: /api/questions/
    """
    queryset = Question.objects.all()
    serializer_class = QuestionSerializer