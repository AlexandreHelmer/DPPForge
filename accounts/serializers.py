from rest_framework import serializers
from .models import Company

class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ['id', 'email', 'company_name', 'company_registration', 'status', 'is_staff']
        read_only_fields = ['id', 'status', 'is_staff']
