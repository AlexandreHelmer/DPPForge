from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ItemViewSet, SnapshotViewSet,
    DigitalTwinViewSet, PublicDigitalTwinViewSet,
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
router.register(r'items', ItemViewSet, basename='item')
router.register(r'snapshots', SnapshotViewSet, basename='snapshot')
router.register(r'twins', DigitalTwinViewSet, basename='twin')
router.register(r'public/twins', PublicDigitalTwinViewSet, basename='public-twin')
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
