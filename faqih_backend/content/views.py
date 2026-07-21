# content/views.py

from django.http import Http404, HttpResponse
from rest_framework import viewsets
from .models import Category, Unit, Question
from .serializers import CategorySerializer, UnitSerializer, QuestionSerializer


def question_image(request, pk):
    """Veritabanında saklanan soru görselini servis eder."""
    try:
        q = Question.objects.get(pk=pk)
    except Question.DoesNotExist:
        raise Http404
    if not q.image_data:
        raise Http404
    response = HttpResponse(bytes(q.image_data), content_type=q.image_mime or 'image/jpeg')
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