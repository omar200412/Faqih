from .settings import *
import os
import dj_database_url

# Canlı ortamda hata ayıklama modu KESİNLİKLE kapalı olmalıdır
DEBUG = False

# Güvenlik anahtarını ortam değişkenlerinden al (Yoksa build sırasında geçici bir tane kullan)
SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-build-key-change-me')

# Railway'in atayacağı rastgele domainlere ve senin kendi domainine izin ver
ALLOWED_HOSTS = ['*']

# --- CSRF VE HTTPS GÜVENLİK AYARLARI (403 HATASI KESİN ÇÖZÜMÜ) ---
# Django'nun Railway üzerinden gelen form isteklerine (Admin girişi vb.) güvenmesi için
CSRF_TRUSTED_ORIGINS = [
    'https://faqih-production.up.railway.app',
    'https://*.up.railway.app',
    'https://faqih.site'
]

# Railway sunucusu arkasında HTTPS kullanıldığını Django'ya kanıtlamak için
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Çerezlerin (Cookies) sadece güvenli HTTPS bağlantısı üzerinden iletilmesini sağlar
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SECURE = True
# -----------------------------------------------------------------

# Veritabanı Ayarları: Railway'in otomatik sağlayacağı DATABASE_URL'i kullan
DATABASES = {
    'default': dj_database_url.config(
        default=os.environ.get('DATABASE_URL'),
        conn_max_age=600,
        conn_health_checks=True,
    )
}

# Whitenoise Middleware Ayarı (Admin panelinin renkli ve düzgün görünmesi için)
# SecurityMiddleware'den hemen sonra gelmesi gerektiği için 1. indexe ekliyoruz
if 'whitenoise.middleware.WhiteNoiseMiddleware' not in MIDDLEWARE:
    MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')

# Statik Dosya (CSS, JS, Görseller) Ayarları
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'