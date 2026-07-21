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

# Veritabanı boşsa başlangıç içeriğini yükle (dolu veritabanına dokunmaz)
if python manage.py shell -c "from content.models import Category; raise SystemExit(0 if Category.objects.exists() else 1)"; then
  echo "İçerik zaten var — seed atlandı"
else
  python manage.py loaddata seed_content
fi

# Admin kullanıcısını oluştur
python yukle.py
