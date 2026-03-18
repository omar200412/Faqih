import os
import json
import django

# Django ayarlarını projene göre yüklüyoruz (İç klasör adının fakih_backend olduğunu farz ediyoruz)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fakih_backend.settings')
django.setup()

# Modellerini 'content' app'inden içeri aktarıyoruz (Option modeli yok, JSON kullanıyoruz)
from content.models import Category, Unit, Question

def seed_real_data():
    print("🧹 Veritabanı temizleniyor (Eski test verileri siliniyor)...")
    Category.objects.all().delete()
    
    # GERÇEK İSLAMİ EĞİTİM VERİLERİ
    real_data = [
        {
            "title": "İbadetler (Fıkıh)",
            "description": "Namaz, abdest, oruç gibi temel ibadetlerin kuralları.",
            "image_url": "https://images.unsplash.com/photo-1583089892943-e5f5600d8d6f",
            "units": [
                {
                    "title": "Temizlik ve Abdest",
                    "order": 1,
                    "questions": [
                        {
                            "text": "Aşağıdakilerden hangisi abdestin farzlarından biri değildir?",
                            "question_type": "multiple_choice",
                            "correct_option": "D",
                            "explanation": "Maide Suresi 6. Ayete göre abdestin farzları 4'tür: Yüzü yıkamak, elleri dirseklerle beraber yıkamak, başın dörtte birini mesh etmek ve ayakları topuklarla beraber yıkamak. Niyet etmek Hanefi mezhebine göre sünnettir.",
                            "options_json": [
                                {"id": "A", "text": "Yüzü yıkamak"},
                                {"id": "B", "text": "Başın dörtte birini mesh etmek"},
                                {"id": "C", "text": "Ayakları topuklarla beraber yıkamak"},
                                {"id": "D", "text": "Niyet etmek"}
                            ]
                        },
                        {
                            "text": "Görseldeki insan figüründe, abdest alırken yıkanması FARZ olan bölgeyi seçiniz (Yüz bölgesi).",
                            "question_type": "hotspot",
                            "correct_option": "YUZ",
                            "explanation": "Kur'an'da 'Yüzlerinizi yıkayın' emri gereği yüzü yıkamak abdestin kesin bir farzıdır.",
                            "options_json": {
                                "hotspots": [
                                    {"id": "YUZ", "style": {"top": "5%", "left": "40%", "width": "20%", "height": "15%"}},
                                    {"id": "GOGUS", "style": {"top": "25%", "left": "30%", "width": "40%", "height": "25%"}},
                                    {"id": "DIZ", "style": {"top": "60%", "left": "35%", "width": "30%", "height": "20%"}}
                                ]
                            }
                        }
                    ]
                },
                {
                    "title": "Namaz Kılavuzu",
                    "order": 2,
                    "questions": [
                        {
                            "text": "Namazda ayakta durmaya ne ad verilir?",
                            "question_type": "multiple_choice",
                            "correct_option": "B",
                            "explanation": "Kıyam, namazda ayakta durmak demektir ve namazın içindeki farzlardandır.",
                            "options_json": [
                                {"id": "A", "text": "Rükû"},
                                {"id": "B", "text": "Kıyam"},
                                {"id": "C", "text": "Secde"},
                                {"id": "D", "text": "Kıraat"}
                            ]
                        }
                    ]
                }
            ]
        },
        {
            "title": "İnanç (Akaid)",
            "description": "İmanın şartları, Allah'ın sıfatları ve temel inanç esasları.",
            "image_url": "https://images.unsplash.com/photo-1564683214964-6f0190ab12f1",
            "units": [
                {
                    "title": "İmanın Şartları",
                    "order": 1,
                    "questions": [
                        {
                            "text": "Allah'ın zati sıfatlarından olan 'Kıdem' ne anlama gelmektedir?",
                            "question_type": "multiple_choice",
                            "correct_option": "A",
                            "explanation": "Kıdem, Allah'ın varlığının bir başlangıcı olmaması, ezelî olması demektir.",
                            "options_json": [
                                {"id": "A", "text": "Varlığının başlangıcı olmaması (Ezelî)"},
                                {"id": "B", "text": "Varlığının sonu olmaması (Ebedî)"},
                                {"id": "C", "text": "Sonradan olanlara benzememesi"},
                                {"id": "D", "text": "Hiçbir şeye muhtaç olmaması"}
                            ]
                        }
                    ]
                }
            ]
        }
    ]

    print("🚀 Gerçek veriler yükleniyor...")

    for cat_data in real_data:
        category = Category.objects.create(
            title=cat_data["title"],
            description=cat_data["description"],
            image_url=cat_data["image_url"]
        )
        print(f"📁 Kategori eklendi: {category.title}")

        for unit_data in cat_data["units"]:
            unit = Unit.objects.create(
                category=category, 
                title=unit_data["title"],
                order=unit_data["order"]
            )
            print(f"  └─ 📘 Ünite eklendi: {unit.title}")

            for q_data in unit_data["questions"]:
                # JSON verisini string'e çevirip kaydediyoruz
                options_str = json.dumps(q_data["options_json"], ensure_ascii=False)
                
                Question.objects.create(
                    unit=unit,
                    text=q_data["text"],
                    question_type=q_data["question_type"],
                    options_json=options_str, # Doğrudan JSON formatında TextField'a yazılır
                    correct_option=q_data["correct_option"],
                    explanation=q_data["explanation"]
                )
                print(f"      └─ ❓ Soru eklendi: {q_data['text'][:30]}...")

    print("\n✅ BÜTÜN GERÇEK VERİLER BAŞARIYLA VERİTABANINA YAZILDI HOMİE!")

if __name__ == '__main__':
    seed_real_data()