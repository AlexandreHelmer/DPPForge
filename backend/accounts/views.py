from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from allauth.socialaccount.models import SocialAccount
from .social_serializers import SocialAccountSerializer


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
