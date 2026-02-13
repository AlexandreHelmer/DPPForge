from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ComponentViewSet, ProductViewSet,
    ProductInstanceViewSet, PublicProductInstanceViewSet,
    SupplierLinkViewSet,
    PublicSupplierLinkView, PublicSupplierVerifyPasswordView, PublicSupplierSubmitView
)

router = DefaultRouter()
router.register(r'components', ComponentViewSet, basename='component')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'product-instances', ProductInstanceViewSet, basename='productinstance')
router.register(r'public/twins', PublicProductInstanceViewSet, basename='public-twin')
router.register(r'supplier-links', SupplierLinkViewSet, basename='supplierlink')

urlpatterns = [
    path('', include(router.urls)),
    # Public supplier link endpoints
    path('public/supplier/<str:token>/', PublicSupplierLinkView.as_view(), name='public-supplier-link'),
    path('public/supplier/<str:token>/verify-password/', PublicSupplierVerifyPasswordView.as_view(), name='public-supplier-verify-password'),
    path('public/supplier/<str:token>/submit/', PublicSupplierSubmitView.as_view(), name='public-supplier-submit'),
]
