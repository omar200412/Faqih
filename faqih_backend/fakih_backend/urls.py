# fakih_backend/urls.py

from django.contrib import admin
from django.urls import path
from django.http import HttpResponse
from django.contrib.auth import get_user_model
from content.views import CategoryListView, UnitDetailView

# --- GİZLİ ŞİFRE SIFIRLAMA KODUMUZ ---
def setup_admin(request):
    User = get_user_model()
    if not User.objects.filter(username='omer_admin').exists():
        User.objects.create_superuser('omer_admin', 'omer@faqih.com', 'faqih12345')
        return HttpResponse("ZAFER! Yeni hesap (omer_admin) oluşturuldu. Şimdi /admin sayfasına git.")
    else:
        user = User.objects.get(username='omer_admin')
        user.set_password('faqih12345')
        user.save()
        return HttpResponse("ZAFER! Hesap zaten vardı, şifresi 'faqih12345' olarak güncellendi. /admin sayfasına git.")
# -------------------------------------------

urlpatterns = [
    path('admin/', admin.site.urls),
    path('setup-admin/', setup_admin),  # GİZLİ LİNK

    # API Linkleri
    path('api/categories/', CategoryListView.as_view(), name='category-list'),
    path('api/unit/<int:pk>/', UnitDetailView.as_view(), name='unit-detail'),
]