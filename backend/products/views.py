from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Component, Product, ProductInstance
from .serializers import (
    ComponentSerializer, ProductSerializer, ProductListSerializer,
    ProductInstanceSerializer, ProductInstanceCreateSerializer,
    PublicProductInstanceSerializer
)


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object to edit it.
    """
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions are only allowed to the owner.
        return obj.company == request.user


class ComponentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Component CRUD operations.
    """
    serializer_class = ComponentSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    
    def get_queryset(self):
        # Only show components belonging to the current user
        return Component.objects.filter(company=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(company=self.request.user)

    def perform_update(self, serializer):
        instance = self.get_object()
        # Check if component is used in any LOCKED product
        if instance.products.filter(status='LOCKED').exists():
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Ce composant ne peut pas être modifié car il est utilisé dans un produit verrouillé.")
        serializer.save()

    def perform_destroy(self, instance):
        # Check if used in any product
        if instance.products.exists():
            from rest_framework.exceptions import ValidationError
            product_names = ", ".join([p.name for p in instance.products.all()[:3]])
            raise ValidationError(f"Ce composant est utilisé par les produits suivants : {product_names}. Supprimez-le d'abord des produits.")
        instance.delete()


class ProductViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Product CRUD operations.
    """
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ProductListSerializer
        return ProductSerializer
    
    def get_queryset(self):
        # Only show products belonging to the current user
        return Product.objects.filter(company=self.request.user).prefetch_related('components')
    
    def perform_create(self, serializer):
        serializer.save(company=self.request.user)

    def perform_destroy(self, instance):
        if instance.status == 'LOCKED':
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Un produit verrouillé ne peut pas être supprimé. Utilisez l'archivage à la place.")
        instance.delete()

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        product = self.get_object()
        product.is_archived = True
        product.save()
        return Response({'status': 'archived'})

    @action(detail=True, methods=['post'])
    def unarchive(self, request, pk=None):
        product = self.get_object()
        product.is_archived = False
        product.save()
        return Response({'status': 'active'})
    
    @action(detail=True, methods=['post'])
    def generate_json_ld(self, request, pk=None):
        """
        Manually trigger JSON-LD generation for a product.
        """
        product = self.get_object()
        json_ld = product.generate_json_ld()
        product.save()
        return Response({
            'message': 'JSON-LD généré avec succès',
            'json_ld': json_ld
        })
    
    @action(detail=True, methods=['post'])
    def lock(self, request, pk=None):
        """
        Lock a product (set status to LOCKED).
        """
        product = self.get_object()
        if product.status != 'COMPLETE':
            return Response(
                {'error': 'Le produit doit être complet avant d\'être verrouillé'},
                status=status.HTTP_400_BAD_REQUEST
            )
        product.status = 'LOCKED'
        product.save()
        return Response({'message': 'Produit verrouillé', 'status': product.status})


class ProductInstanceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for ProductInstance CRUD operations.
    """
    serializer_class = ProductInstanceSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Only show instances of products belonging to the current user
        return ProductInstance.objects.filter(
            product__company=self.request.user
        ).select_related('product')
    
    @action(detail=False, methods=['post'])
    def batch_create(self, request):
        """
        Batch create product instances with QR codes.
        POST /api/product-instances/batch_create/
        {
            "product": "uuid",
            "quantity": 10,
            "production_batch": "BATCH-2024-01",
            "serial_number_prefix": "SN"
        }
        """
        serializer = ProductInstanceCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Verify the product is LOCKED
        product = serializer.validated_data['product']
        if product.status != 'LOCKED':
            return Response(
                {'error': 'Seuls les produits verrouillés peuvent avoir des QR Twins.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if product.company != request.user:
            return Response(
                {'error': 'Vous n\'avez pas la permission de créer des instances pour ce produit'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        instances = serializer.save()
        
        return Response({
            'message': f'{len(instances)} instances créées avec succès',
            'instances': ProductInstanceSerializer(instances, many=True).data
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def regenerate_qr(self, request, pk=None):
        """
        Regenerate QR code for a specific instance.
        """
        instance = self.get_object()
        instance.generate_qr_code()
        instance.save()
        return Response({
            'message': 'QR code régénéré',
            'qr_code': request.build_absolute_uri(instance.qr_code.url) if instance.qr_code else None
        })


class PublicProductInstanceViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Public viewset for viewing product digital twins.
    No authentication required - accessible via QR code.
    """
    queryset = ProductInstance.objects.all().select_related('product')
    serializer_class = PublicProductInstanceSerializer
    permission_classes = [permissions.AllowAny]
    
    def retrieve(self, request, pk=None):
        """
        Get public information about a product instance.
        """
        instance = get_object_or_404(ProductInstance, pk=pk)
        
        # Only show if the product is locked (finalized)
        if instance.product.status != 'LOCKED':
            return Response(
                {'error': 'Ce produit n\'est pas encore disponible publiquement'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
