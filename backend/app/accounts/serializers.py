from rest_framework import serializers
from dj_rest_auth.serializers import PasswordResetSerializer, PasswordResetConfirmSerializer
from dj_rest_auth.registration.serializers import RegisterSerializer
from dj_rest_auth.serializers import LoginSerializer
from allauth.account.models import EmailAddress
from .models import Company
from .forms import CustomPasswordResetForm


class CustomPasswordResetSerializer(PasswordResetSerializer):
    @property
    def password_reset_form_class(self):
        return CustomPasswordResetForm


class CustomPasswordResetConfirmSerializer(PasswordResetConfirmSerializer):
    """
    Standard dj-rest-auth serializer. 
    Handles UID and Token verification using Allauth logic automatically.
    """
    def validate(self, attrs):
        # The parent (PasswordResetConfirmSerializer) handles ALL the validation
        attrs = super().validate(attrs)
        
        # We just add our business logic
        user = self.user
        if user and user.status == 'PENDING':
            user.status = 'ACTIVE'
            user.save()
            
        return attrs

# (Reste du fichier identique au standard précédent...)
class CompanySerializer(serializers.ModelSerializer):
    has_password = serializers.SerializerMethodField()
    class Meta:
        model = Company
        fields = ['id', 'email', 'company_name', 'company_registration', 'status', 'is_staff', 'has_password']
        read_only_fields = ['id', 'status', 'is_staff']
    def get_has_password(self, obj):
        return obj.has_usable_password()

class CustomRegisterSerializer(RegisterSerializer):
    username = serializers.CharField(required=False, allow_blank=True)
    company_name = serializers.CharField(required=True, max_length=255)
    company_registration = serializers.CharField(required=False, allow_blank=True, max_length=100)
    def get_cleaned_data(self):
        data = super().get_cleaned_data()
        data['company_name'] = self.validated_data.get('company_name', '')
        data['company_registration'] = self.validated_data.get('company_registration', '')
        return data
    def save(self, request):
        user = super().save(request)
        user.company_name = self.validated_data.get('company_name', '')
        user.company_registration = self.validated_data.get('company_registration', '')
        if not user.username:
            user.username = user.email
        user.save()
        return user

class CustomLoginSerializer(LoginSerializer):
    username = None
    def validate(self, attrs):
        from django.contrib.auth import authenticate
        email = attrs.get('email')
        password = attrs.get('password')
        user = authenticate(request=self.context.get('request'), email=email, password=password)
        if not user:
            try:
                user_obj = Company.objects.get(email=email)
                if not user_obj.check_password(password):
                    raise serializers.ValidationError({'non_field_errors': ['Identifiants invalides']})
                user = user_obj
            except Company.DoesNotExist:
                raise serializers.ValidationError({'non_field_errors': ['Identifiants invalides']})
        if user:
            if user.status == 'DELETED': raise serializers.ValidationError({'non_field_errors': ['Ce compte a été supprimé.']})
            if user.status == 'SUSPENDED': raise serializers.ValidationError({'non_field_errors': ['Ce compte est suspendu.']})
            email_obj = EmailAddress.objects.filter(user=user, email=user.email).first()
            if not email_obj or not email_obj.verified:
                raise serializers.ValidationError({'non_field_errors': [{'error': "Email non vérifié", 'code': 'EMAIL_NOT_VERIFIED', 'email': user.email}]})
            if not user.is_active:
                raise serializers.ValidationError({'non_field_errors': [{'error': "Compte inactif", 'code': 'ACCOUNT_INACTIVE', 'email': user.email}]})
            attrs['user'] = user
        return attrs

class EmailAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailAddress
        fields = ['id', 'email', 'verified', 'primary']
        read_only_fields = ['verified', 'primary']


class ContactSerializer(serializers.Serializer):
    firstName = serializers.CharField(max_length=255, required=True)
    lastName = serializers.CharField(max_length=255, required=True)
    email = serializers.EmailField(required=True)
    subject = serializers.CharField(max_length=255, required=False, allow_blank=True)
    message = serializers.CharField(max_length=5000, required=True)
    company = serializers.CharField(max_length=255, required=False, allow_blank=True)
