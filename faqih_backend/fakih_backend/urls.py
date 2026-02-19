# fakih_backend/urls.py

from django.contrib import admin
from django.urls import path
from content.views import CategoryListView, UnitDetailView

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API Linkleri
    path('api/categories/', CategoryListView.as_view(), name='category-list'),
    path('api/unit/<int:pk>/', UnitDetailView.as_view(), name='unit-detail'),
]