from rest_framework import serializers
from allauth.socialaccount.models import SocialAccount


class SocialAccountSerializer(serializers.ModelSerializer):
    """
    Serializer for social account data.
    """
    provider_name = serializers.SerializerMethodField()
    
    class Meta:
        model = SocialAccount
        fields = ['id', 'provider', 'provider_name', 'uid', 'date_joined']
        read_only_fields = ['id', 'provider', 'uid', 'date_joined']
    
    def get_provider_name(self, obj):
        """Get human-readable provider name."""
        provider_map = {
            'google': 'Google',
            'microsoft': 'Microsoft',
            'github': 'GitHub',
        }
        return provider_map.get(obj.provider, obj.provider.capitalize())
