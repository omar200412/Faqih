# fakih_backend/urls.py

from django.contrib import admin
from django.urls import path, re_path, include
from django.conf import settings
from django.views.static import serve

urlpatterns = [
    path('admin/', admin.site.urls),

    # API Linkleri
    path('api/', include('content.urls')),
]

# İŞTE STATİK DOSYALARI (CSS/TASARIM) ZORLA GETİREN O SİHİRLİ KOD
urlpatterns += [
    re_path(r'^static/(?P<path>.*)$', serve, {'document_root': settings.STATIC_ROOT}),
]