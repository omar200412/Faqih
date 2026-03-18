from .settings import *
import os
import dj_database_url

DEBUG = False

# Railway ve kendi domainlerin
ALLOWED_HOSTS = [
    'faqih-production.up.railway.app', # Tam linki eklemek her zaman daha güvenlidir
    'faqih.site',
    'www.faqih.site',
    '.railway.app',
]

# Veritabanı
if os.environ.get('DATABASE_URL'):
    DATABASES = {
        'default': dj_database_url.config(
            default=os.environ.get('DATABASE_URL'),
            conn_max_age=600,
        )
    }

# --- MODERN ARA YÜZ (JAZZMIN) AYARLARI ---
# INSTALLED_APPS'e Jazzmin'i en üste eklemeliyiz (Admin'den önce gelmeli)
INSTALLED_APPS = ['jazzmin'] + [app for app in INSTALLED_APPS if app != 'jazzmin']

JAZZMIN_SETTINGS = {
    "site_title": "Faqih Admin",
    "site_header": "Faqih",
    "site_brand": "Faqih Yönetim",
    "welcome_sign": "Faqih Yönetim Paneline Hoş Geldiniz",
    "copyright": "Faqih Ltd",
    "search_model": ["auth.User", "content.Kategoriler"],
    "topmenu_links": [
        {"name": "Ana Sayfa", "url": "admin:index", "permissions": ["auth.view_user"]},
        {"name": "Siteyi Gör", "url": "https://faqih.site", "new_window": True},
    ],
    "show_sidebar": True,
    "navigation_expanded": True,
    "icons": {
        "auth": "fas fa-users-cog",
        "auth.user": "fas fa-user",
        "content.Kategoriler": "fas fa-list",
        "content.Sorular": "fas fa-question-circle",
        "content.Üniteler": "fas fa-layer-group",
    },
    "changeform_format": "horizontal_tabs",
}

JAZZMIN_UI_TWEAKS = {
    "theme": "flatly", # Modern ve temiz bir tema
    "dark_mode_theme": "darkly",
}
# ---------------------------------------

# Statik Dosyalar (WhiteNoise Fix)
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATIC_URL = '/static/'

# Middleware (WhiteNoise en üstlerde olmalı)
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

CORS_ALLOW_ALL_ORIGINS = True
SECRET_KEY = os.environ.get('SECRET_KEY', SECRET_KEY)

# HTTPS Ayarları
SECURE_SSL_REDIRECT = False
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
CSRF_TRUSTED_ORIGINS = [
    'https://faqih-production.up.railway.app',
    'https://faqih.site',
]