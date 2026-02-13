from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from allauth.socialaccount.models import SocialAccount
from .social_serializers import SocialAccountSerializer
from .serializers import EmailAddressSerializer, ContactSerializer
from django.core.mail import send_mail
from django.conf import settings


class SocialAccountListView(generics.ListAPIView):
    """
    List connected social accounts.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = SocialAccountSerializer
    
    def get_queryset(self):
        return SocialAccount.objects.filter(user=self.request.user)


class DisconnectSocialAccountView(APIView):
    """
    Disconnect a social account.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, account_id):
        try:
            account = SocialAccount.objects.get(
                id=account_id,
                user=request.user
            )
            
            # Ensure user has password or other social accounts
            if not request.user.has_usable_password():
                other_accounts = SocialAccount.objects.filter(
                    user=request.user
                ).exclude(id=account_id).count()
                
                if other_accounts == 0:
                    return Response(
                        {'error': 'Vous devez définir un mot de passe avant de déconnecter votre dernier compte social'},
                        status=400
                    )
            
            provider = account.provider
            account.delete()
            return Response({
                'message': f'Compte {provider} déconnecté avec succès'
            })
            
        except SocialAccount.DoesNotExist:
            return Response(
                {'error': 'Compte social non trouvé'},
                status=404
            )


class SocialLoginSuccessView(APIView):
    """
    Success page for social login popup.
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        from django.shortcuts import render
        return render(request, 'socialaccount/login_success.html')


class DeleteAccountView(APIView):
    """
    Delete (anonymize) the user's account.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        password = request.data.get('password')
        
        # If the user has a password, we must verify it
        if request.user.has_usable_password():
            if not password:
                return Response(
                    {'error': 'Veuillez confirmer votre mot de passe pour supprimer le compte'},
                    status=400
                )
            if not request.user.check_password(password):
                return Response(
                    {'error': 'Mot de passe incorrect'},
                    status=400
                )
        
        # Anonymize the account (PII removal while keeping objects)
        user = request.user
        user.anonymize()
        
        return Response({'message': 'Compte supprimé avec succès'})

class EmailListView(APIView):
    """
    List all email addresses associated with the user.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        from allauth.account.models import EmailAddress
        emails = EmailAddress.objects.filter(user=request.user)
        serializer = EmailAddressSerializer(emails, many=True)
        return Response({'emails': serializer.data})
    
    def post(self, request):
        """Add a new email address."""
        email = request.data.get('email')
        if not email:
            return Response({'error': 'L\'email est obligatoire'}, status=400)
        
        from allauth.account.models import EmailAddress
        if EmailAddress.objects.filter(email__iexact=email).exists():
            return Response({'error': 'Cet email est déjà utilisé'}, status=400)
            
        # Create the email address
        new_email = EmailAddress.objects.add_email(request, request.user, email, confirm=True)
        return Response({
            'message': f'L\'email {email} a été ajouté. Un lien de vérification a été envoyé.',
            'email': EmailAddressSerializer(new_email).data
        })


class MakeEmailPrimaryView(APIView):
    """
    Set an email address as primary.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        email_str = request.data.get('email')
        if not email_str:
            return Response({'error': 'L\'email est obligatoire'}, status=400)
            
        from allauth.account.models import EmailAddress
        try:
            email_obj = EmailAddress.objects.get(user=request.user, email__iexact=email_str)
            if not email_obj.verified:
                return Response({'error': 'L\'email doit être vérifié avant d\'être défini comme principal'}, status=400)
            
            email_obj.set_as_primary()
            
            # Sync user's main email field
            request.user.email = email_obj.email
            request.user.save()
            
            return Response({'message': f'L\'email {email_str} est maintenant votre email principal'})
        except EmailAddress.DoesNotExist:
            return Response({'error': 'Email non trouvé'}, status=404)


class ResendVerificationView(APIView):
    """
    Resend verification email.
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        email_str = request.data.get('email')
        if not email_str:
            return Response({'error': 'L\'email est obligatoire'}, status=400)
            
        from allauth.account.models import EmailAddress
        try:
            # If authenticated, try to find for that user first
            if request.user.is_authenticated:
                email_obj = EmailAddress.objects.filter(user=request.user, email__iexact=email_str).first()
            else:
                # If not authenticated, find any matching email
                email_obj = EmailAddress.objects.filter(email__iexact=email_str, verified=False).first()
            
            if not email_obj:
                # Silently return success to avoid email enumeration
                return Response({'message': f'Si cet email existe dans notre système, un lien de vérification a été envoyé.'})
            
            if email_obj.verified:
                return Response({'error': 'Cet email est déjà vérifié'}, status=400)
            
            email_obj.send_confirmation(request)
            return Response({'message': f'Email de vérification renvoyé à {email_str}'})
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': 'Erreur lors de l\'envoi'}, status=500)
from dj_rest_auth.views import PasswordResetConfirmView
from .serializers import CustomPasswordResetConfirmSerializer

class CustomPasswordResetConfirmView(PasswordResetConfirmView):
    """
    Override to ensure our custom serializer is used.
    """
    serializer_class = CustomPasswordResetConfirmSerializer


class ContactView(APIView):
    """
    API endpoint to receive contact form submissions and send emails.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ContactSerializer(data=request.data)
        if serializer.is_valid():
            firstName = serializer.validated_data['firstName']
            lastName = serializer.validated_data['lastName']
            email = serializer.validated_data['email']
            subject = serializer.validated_data.get('subject', 'Non précisé')
            message = serializer.validated_data['message']
            company = serializer.validated_data.get('company', 'Non précisée')

            full_message = f"Nom: {firstName} {lastName}\nEmail: {email}\nEntreprise: {company}\n\nMessage:\n{message}"
            
            try:
                send_mail(
                    subject=f"[DPPForge Contact] {subject}",
                    message=full_message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[settings.CONTACT_EMAIL],
                    fail_silently=False,
                )
                return Response({'message': 'Message envoyé avec succès. Nous vous recontacterons bientôt.'})
            except Exception as e:
                return Response({'error': f'Erreur lors de l\'envoi de l\'email: {str(e)}'}, status=500)
        
        return Response(serializer.errors, status=400)
