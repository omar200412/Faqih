from .settings import *
import os
import dj_database_url

DEBUG = False

# Render'ın domainlerini ekledik
ALLOWED_HOSTS = [
    'faqih.onrender.com', # Render'da kuracağımız isme göre bunu güncelleyeceğiz
    '.onrender.com',
    'faqih.site',
    'www.faqih.site',
    '*'
]

# VERİTABANI BAĞLANTISI 
DATABASES = {
    'default': dj_database_url.config(
        default=os.environ.get('DATABASE_URL', 'sqlite:///' + os.path.join(BASE_DIR, 'db.sqlite3')),
        conn_max_age=600,
    )
}

# STATİK DOSYA (CSS) AYARLARI
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedStaticFilesStorage",
    },
}

# MIDDLEWARE
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'fakih_backend.middleware.AutoLoginMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-build-key')

# HTTPS ve GÜVENLİK
SECURE_SSL_REDIRECT = False
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# Render için güvenlik izinleri eklendi
CSRF_TRUSTED_ORIGINS = [
    'https://*.onrender.com',
    'https://faqih.site',
    'https://www.faqih.site',
]