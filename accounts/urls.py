from django.urls import path
from .views import LoginView, UserDetailView

urlpatterns = [
    path('', LoginView.as_view(), name='api_login'),
    path('user/', UserDetailView.as_view(), name='api_user_detail'),
]
