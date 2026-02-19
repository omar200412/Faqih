import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fakih_backend.settings')
django.setup()

from content.models import Category, Unit, Question

def fix_image():
    # 1. Üniteyi Bul
    try:
        unit = Unit.objects.get(title="Abdest (The Ritual)")
    except Unit.DoesNotExist:
        print("Hata: Ünite bulunamadı. Önce yukle_abdest.py çalıştırılmalı.")
        return

    # 2. Koordinatlar (Yeni Resme Göre Ayarlı)
    # Resim: Basit bir insan vücudu çizimi (Wikipedia)
    # Baş: %5 üstten, %40 soldan...
    hotspot_data = {
        "background_image": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Human_body_schema-en.svg/340px-Human_body_schema-en.svg.png",
        "hotspots": [
            {
                "id": "A",
                "text": "Yüz (Farz)",
                "style": {"top": "2%", "left": "42%", "width": "16%", "height": "13%"}
            },
            {
                "id": "B",
                "text": "Sağ Kol (Farz)",
                "style": {"top": "18%", "left": "15%", "width": "20%", "height": "35%"}
            },
            {
                "id": "C",
                "text": "Sol Kol (Farz)",
                "style": {"top": "18%", "left": "65%", "width": "20%", "height": "35%"}
            },
            {
                "id": "D",
                "text": "Ayaklar (Farz)",
                "style": {"top": "85%", "left": "30%", "width": "40%", "height": "12%"}
            },
            {
                "id": "E",
                "text": "Boyun (Sünnet)",
                "style": {"top": "15%", "left": "42%", "width": "16%", "height": "5%"}
            }
        ]
    }

    # 3. Eski Soruyu Güncelle (veya yoksa oluştur)
    # update_or_create metodu varsa günceller, yoksa yaratır.
    Question.objects.update_or_create(
        unit=unit,
        question_type="hotspot",
        defaults={
            "text": "Abdestin farzlarından biri olan 'Yüzü Yıkamak' neresidir? Dokun bakalım!",
            "options_json": json.dumps(hotspot_data),
            "correct_option": "A", 
            "explanation": "Hanefi mezhebinde yüzü yıkamak abdestin 4 farzından biridir."
        }
    )
    
    print("✅ Resim ve Koordinatlar Düzeltildi!")

if __name__ == '__main__':
    fix_image()