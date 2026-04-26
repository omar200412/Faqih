# fakih_backend/urls.py

from django.contrib import admin
from django.urls import path, re_path, include
from django.conf import settings
from django.views.static import serve
from django.http import HttpResponse
from django.contrib.auth import get_user_model

# --- GİZLİ ŞİFRE SIFIRLAMA KODUMUZ (Geçici olarak kalabilir) ---
def setup_admin(request):
    User = get_user_model()
    if not User.objects.filter(username='omer_admin').exists():
        User.objects.create_superuser('omer_admin', 'omer@faqih.com', 'faqih12345')
        return HttpResponse("ZAFER! Yeni hesap (omer_admin) oluşturuldu.")
    else:
        user = User.objects.get(username='omer_admin')
        user.set_password('faqih12345')
        user.save()
        return HttpResponse("ZAFER! Şifre 'faqih12345' olarak güncellendi.")
# -------------------------------------------

urlpatterns = [
    path('admin/', admin.site.urls),
    path('setup-admin/', setup_admin),

    # API Linkleri
    path('api/', include('content.urls')),
]

# İŞTE STATİK DOSYALARI (CSS/TASARIM) ZORLA GETİREN O SİHİRLİ KOD
urlpatterns += [
    re_path(r'^static/(?P<path>.*)$', serve, {'document_root': settings.STATIC_ROOT}),
]