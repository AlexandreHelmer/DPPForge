"""
URL configuration for dpp_project project.
"""
from django.contrib import admin
from django.urls import path, include
from django.shortcuts import redirect
from django.conf import settings
from django.conf.urls.static import static
from accounts import views as accounts_views

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API endpoints
    path('api/', include('products.urls')),
    path('api/dashboard/', include('dashboard.urls')),
    
    # Authentication with dj-rest-auth
    path('api/auth/password/reset/confirm/', accounts_views.CustomPasswordResetConfirmView.as_view(), name='password_reset_confirm_api'),
    path('api/auth/', include('dj_rest_auth.urls')),
    path('api/auth/registration/', include('dj_rest_auth.registration.urls')),
    path('api/auth/social/', include('accounts.urls')),  # Custom social auth handling
    
    # OAuth callbacks (allauth handles these)
    path('accounts/', include('allauth.urls')),
    
    # Password reset confirm (needed for reverse() in Django forms)
    # Redirecting to frontend SPA
    path('auth/password-reset/confirm/<uidb64>/<token>/', 
         lambda r, uidb64, token: redirect(f"{settings.FRONTEND_URL}/auth/password-reset/confirm/{uidb64}/{token}"), 
         name='password_reset_confirm'),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

