from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny
from django.contrib.auth import authenticate
from .serializers import CompanySerializer

class LoginView(APIView):
    """
    Custom login view that returns an auth token and user data.
    Uses email as the primary identification.
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        
        if not email or not password:
            return Response(
                {'error': 'Veuillez fournir un email et un mot de passe'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Our custom user model uses email as USERNAME_FIELD,
        # so authenticate() handles it correctly.
        user = authenticate(email=email, password=password)
        
        if user:
            if not user.is_active:
                return Response(
                    {'error': 'Compte inactif. Veuillez vérifier votre email.'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            token, created = Token.objects.get_or_create(user=user)
            return Response({
                'token': token.key,
                'user': CompanySerializer(user).data
            })
        else:
            return Response(
                {'error': 'Identifiants invalides'},
                status=status.HTTP_401_UNAUTHORIZED
            )

class UserDetailView(APIView):
    """
    Endpoint to get current user details from token.
    """
    def get(self, request):
        serializer = CompanySerializer(request.user)
        return Response(serializer.data)
