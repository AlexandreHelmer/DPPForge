from rest_framework import serializers
from django.contrib.auth import authenticate
from django.core.exceptions import ValidationError
from dj_rest_auth.registration.serializers import RegisterSerializer
from dj_rest_auth.serializers import LoginSerializer
from allauth.account.models import EmailAddress
from .models import Company
from .forms import CustomPasswordResetForm
from dj_rest_auth.serializers import PasswordResetSerializer


class CustomPasswordResetSerializer(PasswordResetSerializer):
    @property
    def password_reset_form_class(self):
        return CustomPasswordResetForm


class CustomPasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password1 = serializers.CharField(write_only=True)
    new_password2 = serializers.CharField(write_only=True)

    def validate(self, attrs):
        from django.utils.http import urlsafe_base64_decode
        from django.utils.encoding import force_str
        from django.contrib.auth.tokens import default_token_generator
        import django.core.exceptions

        uidb64 = attrs.get('uid')
        token = attrs.get('token')
        password1 = attrs.get('new_password1')
        password2 = attrs.get('new_password2')

        if password1 != password2:
            raise serializers.ValidationError({"new_password2": ["Les mots de passe ne correspondent pas"]})

        try:
            # Decode the uidb64 to get the actual UUID
            # If it's already a UUID (plain string), this might fail or give garbage
            # But normally it's base64
            decoded_uid = force_str(urlsafe_base64_decode(uidb64))
            
            # Look up the user
            try:
                user = Company.objects.get(pk=decoded_uid)
            except (Company.DoesNotExist, django.core.exceptions.ValidationError):
                # Fallback: maybe it wasn't encoded?
                user = Company.objects.get(pk=uidb64)
                
        except (TypeError, ValueError, OverflowError, Company.DoesNotExist, django.core.exceptions.ValidationError):
            raise serializers.ValidationError({"non_field_errors": ["Le lien de réinitialisation est invalide ou a expiré (UID)."]})

        if not default_token_generator.check_token(user, token):
            # Check if allauth has a different token logic
            raise serializers.ValidationError({"non_field_errors": ["Le lien de réinitialisation est invalide ou a expiré (Token)."]})

        attrs['user'] = user
        return attrs

    def save(self):
        password = self.validated_data.get('new_password1')
        user = self.validated_data.get('user')
        user.set_password(password)
        if user.status == 'PENDING':
            user.status = 'ACTIVE'
        user.save()
        return user


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
        from django.contrib.auth import authenticate
        
        email = attrs.get('email')
        password = attrs.get('password')
        user = None

        if email and password:
            user = authenticate(request=self.context.get('request'), email=email, password=password)
            
            if not user:
                # Password check for better error messages (only if authenticate failed)
                try:
                    user_obj = Company.objects.get(email=email)
                    if not user_obj.check_password(password):
                        raise serializers.ValidationError({'non_field_errors': ['Identifiants invalides']})
                    user = user_obj
                except Company.DoesNotExist:
                    raise serializers.ValidationError({'non_field_errors': ['Identifiants invalides']})
        
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
            
            # If we reached here with an authenticated-ish user but 'authenticate()' had returned None,
            # it might be due to allauth blocking login for unverified emails.
            # But dj-rest-auth expect attrs['user'] to be present.
            attrs['user'] = user
        
        return attrs



class EmailAddressSerializer(serializers.ModelSerializer):
    """Serializer for allauth EmailAddress model."""
    class Meta:
        model = EmailAddress
        fields = ['id', 'email', 'verified', 'primary']
        read_only_fields = ['verified', 'primary']
