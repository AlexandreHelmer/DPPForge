from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ComponentViewSet, ProductViewSet,
    ProductInstanceViewSet, PublicProductInstanceViewSet,
    SupplierLinkViewSet,
    PublicSupplierLinkView, PublicSupplierVerifyPasswordView, PublicSupplierSubmitView
)
from .export_views import (
    ExportAllZipView,
    ExportComponentsCsvView, ImportComponentsCsvView,
    ExportProductsCsvView, ImportProductsCsvView,
    ExportDigitalTwinsCsvView,
    ExportSupplierLinksCsvView,
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

    # Export / Import endpoints
    path('export/zip/', ExportAllZipView.as_view(), name='export-all-zip'),
    path('export/components/csv/', ExportComponentsCsvView.as_view(), name='export-components-csv'),
    path('import/components/csv/', ImportComponentsCsvView.as_view(), name='import-components-csv'),
    path('export/products/csv/', ExportProductsCsvView.as_view(), name='export-products-csv'),
    path('import/products/csv/', ImportProductsCsvView.as_view(), name='import-products-csv'),
    path('export/digital-twins/csv/', ExportDigitalTwinsCsvView.as_view(), name='export-twins-csv'),
    path('export/supplier-links/csv/', ExportSupplierLinksCsvView.as_view(), name='export-supplier-links-csv'),
]
