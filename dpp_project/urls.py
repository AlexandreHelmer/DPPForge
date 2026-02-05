"""
URL configuration for dpp_project project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API endpoints
    path('api/', include('products.urls')),
    path('api/dashboard/', include('dashboard.urls')),
    
    # Authentication (django-allauth)
    path('accounts/', include('allauth.urls')),
    
    # API authentication
    path('api-auth/', include('rest_framework.urls')),
    path('api/login/', include([
        path('', include('accounts.urls')),
    ])),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
