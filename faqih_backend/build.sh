#!/usr/bin/env bash
# Hata olursa kurulumu durdur
set -o errexit

# Paketleri kur
pip install -r requirements.txt

# Statik dosyaları topla (CSS/JS)
python manage.py collectstatic --no-input

# Veritabanı tablolarını oluştur
python manage.py migrate
