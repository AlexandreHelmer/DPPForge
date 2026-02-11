from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ComponentViewSet, ProductViewSet,
    ProductInstanceViewSet, PublicProductInstanceViewSet
)

router = DefaultRouter()
router.register(r'components', ComponentViewSet, basename='component')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'product-instances', ProductInstanceViewSet, basename='productinstance')
router.register(r'public/twins', PublicProductInstanceViewSet, basename='public-twin')

urlpatterns = [
    path('', include(router.urls)),
]
