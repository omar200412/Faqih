#!/usr/bin/env bash
# Hata olursa kurulumu durdur
set -o errexit

# Render'da production ayarlarını kullan
export DJANGO_SETTINGS_MODULE=fakih_backend.settings_prod

# Paketleri kur
pip install -r requirements.txt

# Statik dosyaları topla (CSS/JS)
python manage.py collectstatic --no-input

# Veritabanı tablolarını oluştur
python manage.py migrate

# Admin kullanıcısını oluştur
python yukle.py
