from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone
from .models import Component, Product, ProductInstance, SupplierLink
from .serializers import (
    ComponentSerializer, ProductSerializer, ProductListSerializer,
    ProductInstanceSerializer, ProductInstanceCreateSerializer,
    PublicProductInstanceSerializer,
    SupplierLinkSerializer, SupplierLinkCreateSerializer,
    SupplierSubmitSerializer
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
        # Block edits on supplier-locked components
        if instance.supplier_locked:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Ce composant est verrouillé car validé par le fournisseur. Il ne peut plus être modifié.")
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
        
        # Physically lock all related components
        product.components.all().update(supplier_locked=True)
        
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


class SupplierLinkViewSet(viewsets.ModelViewSet):
    """
    ViewSet for brand-facing SupplierLink management.
    Create, list, and revoke magic links.
    """
    serializer_class = SupplierLinkSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']

    def get_queryset(self):
        return SupplierLink.objects.filter(
            company=self.request.user
        ).select_related('component')

    def get_serializer_class(self):
        if self.action == 'create':
            return SupplierLinkCreateSerializer
        return SupplierLinkSerializer

    def create(self, request, *args, **kwargs):
        serializer = SupplierLinkCreateSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)

        # Verify the component belongs to the user
        component = serializer.validated_data['component']
        if component.company != request.user:
            return Response(
                {'error': 'Ce composant ne vous appartient pas.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Don't allow link creation for already supplier-locked components
        if component.supplier_locked:
            return Response(
                {'error': 'Ce composant est déjà verrouillé par un fournisseur.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Don't allow link creation for already brand-locked components
        if component.products.filter(status='LOCKED').exists():
            return Response(
                {'error': 'Ce composant est verrouillé car il est utilisé dans un produit validé par la marque.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        link = serializer.save()
        return Response(
            SupplierLinkSerializer(link).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'])
    def revoke(self, request, pk=None):
        link = self.get_object()
        link.is_revoked = True
        link.save()
        return Response({'status': 'revoked'})


class PublicSupplierLinkView(APIView):
    """
    Public views for supplier magic link access.
    No authentication required.
    """
    permission_classes = [permissions.AllowAny]

    def _get_link_or_error(self, token):
        """Get a SupplierLink by token, return error response if invalid."""
        link = get_object_or_404(SupplierLink, token=token)

        if link.submitted_at:
            return None, Response(
                {'error': 'Ce lien a déjà été utilisé.', 'reason': 'submitted'},
                status=status.HTTP_410_GONE
            )
        if link.is_revoked:
            return None, Response(
                {'error': 'Ce lien a été révoqué.', 'reason': 'revoked'},
                status=status.HTTP_410_GONE
            )

        # Unified lock: check if component is already locked (even by another link or by the brand)
        if link.component.supplier_locked:
            return None, Response(
                {'error': 'Ce composant est déjà verrouillé.', 'reason': 'locked'},
                status=status.HTTP_410_GONE
            )

        if link.expires_at < timezone.now():
            return None, Response(
                {'error': 'Ce lien a expiré.', 'reason': 'expired'},
                status=status.HTTP_410_GONE
            )
        
        # Check if the component became locked by brand after link creation
        if link.component.products.filter(status='LOCKED').exists():
            return None, Response(
                {'error': 'Ce composant a été validé par la marque et ne peut plus être modifié.', 'reason': 'locked'},
                status=status.HTTP_410_GONE
            )

        return link, None

    def get(self, request, token):
        """
        Validate token. Returns component info and whether password is required.
        """
        link, error = self._get_link_or_error(token)
        if error:
            return error

        component = link.component
        data = {
            'component_name': component.name,
            'company_name': link.company.company_name,
            'is_password_protected': link.is_password_protected,
            'fields_to_fill': {
                'name': component.name,
                'description': component.description,
                'manufacturer': component.manufacturer,
                'material_composition': component.material_composition,
                'certifications': component.certifications,
                'origin_country': component.origin_country,
                'gtin': component.gtin,
            }
        }

        # If not password protected, return fields directly
        if not link.is_password_protected:
            data['authenticated'] = True
        else:
            data['authenticated'] = False
            # Don't return fields_to_fill until password is verified
            data['fields_to_fill'] = None

        return Response(data)


class PublicSupplierVerifyPasswordView(APIView):
    """
    Verify password for a password-protected supplier link.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, token):
        link = get_object_or_404(SupplierLink, token=token)

        if not link.is_valid:
            return Response(
                {'error': 'Ce lien n\'est plus valide.'},
                status=status.HTTP_410_GONE
            )

        password = request.data.get('password', '')
        if not link.check_password(password):
            return Response(
                {'error': 'Mot de passe incorrect.'},
                status=status.HTTP_403_FORBIDDEN
            )

        component = link.component
        return Response({
            'authenticated': True,
            'fields_to_fill': {
                'name': component.name,
                'description': component.description,
                'manufacturer': component.manufacturer,
                'material_composition': component.material_composition,
                'certifications': component.certifications,
                'origin_country': component.origin_country,
                'gtin': component.gtin,
            }
        })


class PublicSupplierSubmitView(APIView):
    """
    Submit supplier data for a component.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, token):
        link = get_object_or_404(SupplierLink, token=token)

        if not link.is_valid:
            return Response(
                {'error': 'Ce lien n\'est plus valide.'},
                status=status.HTTP_410_GONE
            )

        # If password-protected, require password in the request
        if link.is_password_protected:
            password = request.data.get('password', '')
            if not link.check_password(password):
                return Response(
                    {'error': 'Mot de passe incorrect.'},
                    status=status.HTTP_403_FORBIDDEN
                )

        serializer = SupplierSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Update the component with the submitted data
        component = link.component
        data = serializer.validated_data

        for field in ['name', 'description', 'manufacturer', 'material_composition',
                      'certifications', 'origin_country', 'gtin']:
            if field in data:
                setattr(component, field, data[field])

        component.supplier_validated = True
        component.supplier_locked = True
        component.save()

        # Mark link as submitted
        link.submitted_at = timezone.now()
        if data.get('supplier_email'):
            link.supplier_email = data['supplier_email']
        link.save()

        # Send email notification to the brand
        self._send_notification_email(link, component)

        return Response({
            'message': 'Informations soumises avec succès. Merci !',
            'component': {
                'name': component.name,
                'description': component.description,
                'manufacturer': component.manufacturer,
                'material_composition': component.material_composition,
                'certifications': component.certifications,
                'origin_country': component.origin_country,
                'gtin': component.gtin,
            }
        })

    def _send_notification_email(self, link, component):
        """Send an email to the brand notifying that the supplier submitted data."""
        try:
            from django.core.mail import send_mail
            from django.conf import settings

            subject = f'[DPPForge] Fournisseur : données reçues pour « {component.name} »'
            message = (
                f"Bonjour {link.company.company_name},\n\n"
                f"Un fournisseur vient de remplir les informations du composant "
                f"« {component.name} » via le lien magique que vous avez créé.\n\n"
                f"Le composant est maintenant marqué comme validé et verrouillé.\n\n"
                f"Connectez-vous à DPPForge pour consulter les données :\n"
                f"{settings.FRONTEND_URL}/components\n\n"
                f"Cordialement,\n"
                f"L'équipe DPPForge"
            )

            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [link.company.email],
                fail_silently=True,
            )
        except Exception:
            pass  # Don't fail the submission if email fails
