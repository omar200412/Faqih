# fakih_backend/settings_prod.py
# Railway production settings — import this instead of settings.py

from .settings import *
import os

DEBUG = False

ALLOWED_HOSTS = [
    'faqih.site',
    'www.faqih.site',
    '.railway.app',       # Railway default domain
    os.environ.get('RAILWAY_STATIC_URL', ''),
]

# Database — Railway PostgreSQL (otomatik bağlanır)
import dj_database_url
if os.environ.get('DATABASE_URL'):
    DATABASES = {
        'default': dj_database_url.config(
            default=os.environ.get('DATABASE_URL'),
            conn_max_age=600,
        )
    }

# Static files
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATIC_URL  = '/static/'

# CORS — mobil uygulamanın API'ye erişmesi için
CORS_ALLOWED_ORIGINS = [
    'https://faqih.site',
    'http://localhost:8000',
]
CORS_ALLOW_ALL_ORIGINS = True   # geliştirme için, sonra kapat

SECRET_KEY = os.environ.get('SECRET_KEY', SECRET_KEY)