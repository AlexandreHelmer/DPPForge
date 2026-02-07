from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Company


@admin.register(Company)
class CompanyAdmin(UserAdmin):
    """
    Admin interface for Company model.
    """
    list_display = ['email', 'company_name', 'status', 'is_staff', 'created_at']
    list_filter = ['status', 'is_staff', 'is_superuser', 'created_at']
    search_fields = ['email', 'company_name', 'company_registration']
    ordering = ['-created_at']
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Informations Entreprise', {'fields': ('company_name', 'company_registration', 'status')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Dates importantes', {'fields': ('last_login', 'created_at', 'updated_at')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'company_name', 'password1', 'password2', 'status'),
        }),
    )
    
    readonly_fields = ['created_at', 'updated_at']
