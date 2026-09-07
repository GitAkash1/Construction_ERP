from django.urls import path
from .views import LoginView, LogoutView, CheckAuthView, SignupView

urlpatterns = [
    path('login/', LoginView.as_view(), name='auth_login'),
    path('signup/', SignupView.as_view(), name='auth_signup'),
    path('logout/', LogoutView.as_view(), name='auth_logout'),
    path('check/', CheckAuthView.as_view(), name='auth_check'),
]
