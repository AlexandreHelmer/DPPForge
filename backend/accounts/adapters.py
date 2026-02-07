from allauth.account.adapter import DefaultAccountAdapter
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from django.conf import settings


class CompanyAccountAdapter(DefaultAccountAdapter):
    """
    Custom adapter for django-allauth to handle company-specific logic.
    """
    
    def get_login_redirect_url(self, request):
        """
        Redirect to frontend after login.
        """
        return settings.FRONTEND_URL
    
    def get_email_confirmation_url(self, request, emailconfirmation):
        """
        Override to return frontend URL for email verification.
        The frontend will then call the API to verify the email.
        """
        return f"{settings.FRONTEND_URL}/auth/verify-email/{emailconfirmation.key}"
    
    def get_email_verification_redirect_url(self, email_address):
        """
        Redirect to frontend after email confirmation (if done via backend).
        """
        return f"{settings.FRONTEND_URL}/auth/login?verified=true"


class CompanySocialAccountAdapter(DefaultSocialAccountAdapter):
    """
    Custom adapter for social account handling with popup support.
    """
    
    def get_login_redirect_url(self, request):
        """
        Redirect to success page which handles token bridging for popups.
        """
        return "/api/auth/social/social-login-success/"
    
    def pre_social_login(self, request, sociallogin):
        """
        Link social account to existing user if email matches.
        """
        if sociallogin.is_existing:
            return
        
        # Try to link with existing user by email
        try:
            email = sociallogin.account.extra_data.get('email')
            if email:
                from accounts.models import Company
                user = Company.objects.get(email=email)
                sociallogin.connect(request, user)
        except Company.DoesNotExist:
            pass
