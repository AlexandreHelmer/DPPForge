from allauth.account.adapter import DefaultAccountAdapter
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
    
    def get_email_verification_redirect_url(self, email_address):
        """
        Redirect to frontend after email confirmation.
        """
        return f"{settings.FRONTEND_URL}/login?verified=true"
