import os
import django
from django.contrib.auth import get_user_model

# Django'yu başlat
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fakih_backend.settings')
django.setup()

User = get_user_model()

# Admin bilgileri Render'daki Environment Variables'tan gelir — koda şifre yazılmaz
ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD')
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@faqih.site')

if not ADMIN_USERNAME or not ADMIN_PASSWORD:
    print("ADMIN_USERNAME / ADMIN_PASSWORD ortam değişkenleri yok — admin oluşturma atlandı.")
elif not User.objects.filter(username=ADMIN_USERNAME).exists():
    print(f"'{ADMIN_USERNAME}' hesabı oluşturuluyor...")
    User.objects.create_superuser(ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD)
    print("Süper kullanıcı başarıyla oluşturuldu!")
else:
    print(f"'{ADMIN_USERNAME}' hesabı zaten var. Şifresi güncelleniyor...")
    user = User.objects.get(username=ADMIN_USERNAME)
    user.set_password(ADMIN_PASSWORD)
    user.save()
    print("Şifre güncellendi!")
