from .settings import *
import os
import dj_database_url

DEBUG = False

ALLOWED_HOSTS = [
    'faqih-production.up.railway.app',
    'faqih.site',
    'www.faqih.site',
    '.railway.app',
    '*'
]

# MODERN ARA YÜZ (JAZZMIN) - En üstte olmalı
INSTALLED_APPS = ['jazzmin'] + [app for app in INSTALLED_APPS if app != 'jazzmin']

JAZZMIN_SETTINGS = {
    "site_title": "Faqih Admin",
    "site_header": "Faqih",
    "site_brand": "Faqih Yönetim",
    "welcome_sign": "Faqih Yönetim Paneline Hoş Geldiniz",
}

JAZZMIN_UI_TWEAKS = {
    "theme": "flatly",
    "dark_mode_theme": "darkly",
}

# VERİTABANI BAĞLANTISI (Kurulumda çökmemesi için geçici SQLite koruması eklendi)
DATABASES = {
    'default': dj_database_url.config(
        default=os.environ.get('DATABASE_URL', 'sqlite:///' + os.path.join(BASE_DIR, 'db.sqlite3')),
        conn_max_age=600,
    )
}

# STATİK DOSYA (CSS) AYARLARI
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# DİKKAT: 'Manifest' kelimesini kaldırdık. Bu sayede ufak eksiklerde tasarım çökmez!
STATICFILES_STORAGE = 'whitenoise.storage.CompressedStaticFilesStorage'

# MIDDLEWARE (WhiteNoise'un konumu kesinleştirildi)
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

SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-build-key')

# HTTPS ve GÜVENLİK
SECURE_SSL_REDIRECT = False
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
CSRF_TRUSTED_ORIGINS = [
    'https://faqih-production.up.railway.app',
    'https://faqih.site',
]