from django.urls import path, include
from . import views

urlpatterns = [
    # Social account management
    path('accounts/', views.SocialAccountListView.as_view(), name='social_accounts'),
    path('accounts/<int:account_id>/disconnect/', views.DisconnectSocialAccountView.as_view(), name='disconnect_social'),
    
    # Social login success handler (for popup flow)
    path('social-login-success/', views.SocialLoginSuccessView.as_view(), name='social_login_success'),
    
    # Account deletion (custom endpoint for anonymization)
    path('delete-account/', views.DeleteAccountView.as_view(), name='delete_account'),
    
    # Include allauth URLs for OAuth callbacks
    path('', include('allauth.socialaccount.urls')),
]

