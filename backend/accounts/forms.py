from allauth.account.forms import ResetPasswordForm

class CustomPasswordResetForm(ResetPasswordForm):
    """
    Standard Allauth ResetPasswordForm.
    Ensures the token is generated in Allauth format and uses the Adapter for URLs.
    """
    pass
