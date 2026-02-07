from django.contrib.auth.forms import PasswordResetForm
from django.conf import settings
from django.contrib.sites.shortcuts import get_current_site
from django.urls import reverse

class CustomPasswordResetForm(PasswordResetForm):
    def save(self, domain_override=None,
             subject_template_name='registration/password_reset_subject.txt',
             email_template_name='registration/password_reset_email.html',
             use_https=False, token_generator=None,
             from_email=None, request=None, html_email_template_name=None,
             extra_email_context=None):
        """
        Overridden to use the frontend URL instead of the backend one.
        """
        if extra_email_context is None:
            extra_email_context = {}
            
        # Add frontend_url to context
        extra_email_context['frontend_url'] = settings.FRONTEND_URL.rstrip('/')
        
        # We pass a custom template that uses frontend_url
        email_template_name = 'accounts/email/password_reset_email.html'
        
        return super().save(
            domain_override=domain_override,
            subject_template_name=subject_template_name,
            email_template_name=email_template_name,
            use_https=use_https,
            token_generator=token_generator,
            from_email=from_email,
            request=request,
            html_email_template_name=html_email_template_name,
            extra_email_context=extra_email_context
        )
