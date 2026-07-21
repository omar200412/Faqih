from django.urls import path
from . import views

app_name = 'panel'

urlpatterns = [
    path('', views.home, name='home'),
    path('unite/<int:unit_id>/', views.unit_detail, name='unit'),
    path('unite/<int:unit_id>/yeni/', views.type_picker, name='type_picker'),
    path('unite/<int:unit_id>/yeni/<str:qtype>/', views.question_form, name='question_new'),
    path('soru/<int:question_id>/', views.question_form, name='question_edit'),
    path('soru/<int:question_id>/sil/', views.question_delete, name='question_delete'),
    path('kategori-ekle/', views.add_category, name='add_category'),
    path('unite-ekle/', views.add_unit, name='add_unit'),
]
