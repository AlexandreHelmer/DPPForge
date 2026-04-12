from django.contrib import admin
from .models import Item, Snapshot, DigitalTwin, SupplierLink


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ['name', 'company', 'is_main_product', 'supplier', 'supplier_submitted', 'created_at']
    list_filter = ['is_main_product', 'supplier_submitted', 'created_at']
    search_fields = ['name', 'description', 'manufacturer', 'gtin', 'supplier']
    readonly_fields = ['id', 'created_at', 'updated_at']
    filter_horizontal = ['components']


@admin.register(Snapshot)
class SnapshotAdmin(admin.ModelAdmin):
    list_display = ['main_product', 'company', 'created_at']
    list_filter = ['created_at']
    search_fields = ['main_product__name']
    readonly_fields = ['id', 'created_at', 'payload']


@admin.register(DigitalTwin)
class DigitalTwinAdmin(admin.ModelAdmin):
    list_display = ['serial_number', 'snapshot', 'production_batch', 'created_at']
    list_filter = ['created_at']
    search_fields = ['serial_number', 'production_batch', 'notes']
    readonly_fields = ['id', 'qr_code', 'created_at', 'get_public_url']


@admin.register(SupplierLink)
class SupplierLinkAdmin(admin.ModelAdmin):
    list_display = ['component', 'company', 'expires_at', 'is_revoked', 'submitted_at', 'created_at']
    list_filter = ['is_revoked', 'expires_at', 'submitted_at', 'created_at']
    search_fields = ['component__name', 'company__email', 'supplier_email', 'token']
    readonly_fields = ['id', 'token', 'created_at', 'submitted_at', 'updated_at']
