# content/views.py

from rest_framework import generics
from .models import Category, Unit
from .serializers import CategorySerializer, UnitSerializer

class CategoryListView(generics.ListAPIView):
    """
    Tüm kategorileri ve içindeki üniteleri listeler.
    Mobil uygulamanın ana sayfası burayı çekecek.
    """
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

class UnitDetailView(generics.RetrieveAPIView):
    """
    Belirli bir üniteye tıklandığında soruları getirir.
    """
    queryset = Unit.objects.all()
    serializer_class = UnitSerializer