import os
import django
from django.contrib.auth import get_user_model

# Django'yu başlat
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fakih_backend.settings')
django.setup()

User = get_user_model()

# Yeni Admin Bilgileri (Bunları istediğin gibi değiştir)
ADMIN_USERNAME = 'admin_omer'
ADMIN_EMAIL = 'omer@faqih.com'
ADMIN_PASSWORD = 'faqihpassword123'

# Eğer kullanıcı yoksa oluştur
if not User.objects.filter(username=ADMIN_USERNAME).exists():
    print(f"'{ADMIN_USERNAME}' hesabı oluşturuluyor...")
    User.objects.create_superuser(ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD)
    print("Süper kullanıcı başarıyla oluşturuldu!")
else:
    print(f"'{ADMIN_USERNAME}' hesabı zaten var. Şifresi güncelleniyor...")
    # Eğer daha önce oluşturduysa, şifresini sıfırlar
    user = User.objects.get(username=ADMIN_USERNAME)
    user.set_password(ADMIN_PASSWORD)
    user.save()
    print("Şifre güncellendi!")