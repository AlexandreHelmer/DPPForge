from django.contrib import admin
from .models import Component, Product, ProductInstance


@admin.register(Component)
class ComponentAdmin(admin.ModelAdmin):
    list_display = ['name', 'company', 'manufacturer', 'origin_country', 'created_at']
    list_filter = ['created_at', 'origin_country']
    search_fields = ['name', 'description', 'manufacturer', 'gtin']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Informations de base', {
            'fields': ('company', 'name', 'description', 'manufacturer')
        }),
        ('Identifiants', {
            'fields': ('gtin', 'origin_country')
        }),
        ('Composition et Certifications', {
            'fields': ('material_composition', 'certifications')
        }),
        ('Métadonnées', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'gtin', 'company', 'status', 'category', 'created_at']
    list_filter = ['status', 'category', 'created_at']
    search_fields = ['name', 'gtin', 'description', 'brand']
    readonly_fields = ['id', 'json_ld', 'created_at', 'updated_at']
    filter_horizontal = ['components']
    
    fieldsets = (
        ('Informations de base', {
            'fields': ('company', 'name', 'description', 'status')
        }),
        ('Identifiants produit', {
            'fields': ('gtin', 'brand', 'model_number', 'category')
        }),
        ('Production', {
            'fields': ('manufacturing_date', 'components')
        }),
        ('Digital Product Passport', {
            'fields': ('json_ld',),
            'classes': ('collapse',)
        }),
        ('Métadonnées', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['generate_json_ld_action', 'mark_as_complete', 'lock_products']
    
    def generate_json_ld_action(self, request, queryset):
        for product in queryset:
            product.generate_json_ld()
            product.save()
        self.message_user(request, f"{queryset.count()} produits ont été mis à jour avec JSON-LD.")
    generate_json_ld_action.short_description = "Générer JSON-LD pour les produits sélectionnés"
    
    def mark_as_complete(self, request, queryset):
        queryset.update(status='COMPLETE')
        self.message_user(request, f"{queryset.count()} produits marqués comme complets.")
    mark_as_complete.short_description = "Marquer comme complet"
    
    def lock_products(self, request, queryset):
        queryset.update(status='LOCKED')
        self.message_user(request, f"{queryset.count()} produits verrouillés.")
    lock_products.short_description = "Verrouiller les produits"


@admin.register(ProductInstance)
class ProductInstanceAdmin(admin.ModelAdmin):
    list_display = ['serial_number', 'product', 'production_batch', 'created_at']
    list_filter = ['created_at', 'product']
    search_fields = ['serial_number', 'production_batch', 'notes']
    readonly_fields = ['id', 'qr_code', 'created_at', 'get_public_url']
    
    fieldsets = (
        ('Informations de base', {
            'fields': ('product', 'serial_number', 'production_batch')
        }),
        ('QR Code', {
            'fields': ('qr_code', 'get_public_url')
        }),
        ('Notes', {
            'fields': ('notes',)
        }),
        ('Métadonnées', {
            'fields': ('id', 'created_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['generate_qr_codes']
    
    def generate_qr_codes(self, request, queryset):
        for instance in queryset:
            instance.generate_qr_code()
            instance.save()
        self.message_user(request, f"{queryset.count()} QR codes générés.")
    generate_qr_codes.short_description = "Générer QR codes"
