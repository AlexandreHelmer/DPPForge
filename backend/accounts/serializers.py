from rest_framework import serializers
from django.contrib.auth import authenticate
from dj_rest_auth.registration.serializers import RegisterSerializer
from dj_rest_auth.serializers import LoginSerializer
from allauth.account.models import EmailAddress
from .models import Company


class CompanySerializer(serializers.ModelSerializer):
    """Serializer for Company user details."""
    has_password = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = ['id', 'email', 'company_name', 'company_registration', 'status', 'is_staff', 'has_password']
        read_only_fields = ['id', 'status', 'is_staff']

    def get_has_password(self, obj):
        return obj.has_usable_password()


class CustomRegisterSerializer(RegisterSerializer):
    """Custom registration serializer for Company model."""
    username = serializers.CharField(required=False, allow_blank=True)
    company_name = serializers.CharField(required=True, max_length=255)
    company_registration = serializers.CharField(required=False, allow_blank=True, max_length=100)

    def get_cleaned_data(self):
        """Return cleaned data for registration."""
        data = super().get_cleaned_data()
        data['company_name'] = self.validated_data.get('company_name', '')
        data['company_registration'] = self.validated_data.get('company_registration', '')
        return data

    def save(self, request):
        """Create Company user with custom fields."""
        user = super().save(request)
        user.company_name = self.validated_data.get('company_name', '')
        user.company_registration = self.validated_data.get('company_registration', '')
        # Ensure username is set to email if it's empty
        if not user.username:
            user.username = user.email
        user.save()
        return user


class CustomLoginSerializer(LoginSerializer):
    """Custom login serializer with account status validation."""
    username = None  # We don't use username
    
    def validate(self, attrs):
        """Validate credentials and check account status."""
        # First, let the parent handle basic authentication
        try:
            attrs = super().validate(attrs)
        except serializers.ValidationError:
            raise serializers.ValidationError({'non_field_errors': ['Identifiants invalides']})
        
        user = attrs.get('user')
        
        if user:
            # Check account status
            if user.status == 'DELETED':
                raise serializers.ValidationError({'non_field_errors': ['Ce compte a été supprimé.']})
            if user.status == 'SUSPENDED':
                raise serializers.ValidationError({'non_field_errors': ['Ce compte est suspendu. Veuillez contacter le support.']})
            
            # Check if email is verified
            email_obj = EmailAddress.objects.filter(user=user, email=user.email).first()
            if not email_obj or not email_obj.verified:
                raise serializers.ValidationError({
                    'non_field_errors': [{
                        'error': 'Votre email n\'est pas encore vérifié.',
                        'code': 'EMAIL_NOT_VERIFIED',
                        'email': user.email
                    }]
                })
            
            # Check if account is active
            if not user.is_active:
                raise serializers.ValidationError({
                    'non_field_errors': [{
                        'error': 'Compte inactif. Veuillez vérifier votre email.',
                        'code': 'ACCOUNT_INACTIVE',
                        'email': user.email
                    }]
                })
        
        return attrs


