from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .models import Item, Snapshot, DigitalTwin, SupplierLink
from .serializers import (
    ItemSerializer, ItemListSerializer,
    SnapshotSerializer, SnapshotCreateSerializer,
    DigitalTwinSerializer, DigitalTwinCreateSerializer,
    PublicDigitalTwinSerializer,
    SupplierLinkSerializer, SupplierLinkCreateSerializer,
    SupplierSubmitSerializer,
)


class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return getattr(obj, 'company', None) == request.user


class ItemViewSet(viewsets.ModelViewSet):
    """CRUD for current items (products/components)."""
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]

    def get_serializer_class(self):
        if self.action == 'list':
            return ItemListSerializer
        return ItemSerializer

    def get_queryset(self):
        qs = Item.objects.filter(company=self.request.user).prefetch_related('components', 'snapshots')
        # Optional filtering so the frontend can reuse /items/ for products & components
        is_main = self.request.query_params.get('is_main_product', None)
        if is_main is not None:
            val = str(is_main).lower() in ('1', 'true', 'yes')
            qs = qs.filter(is_main_product=val)
        return qs

    def perform_create(self, serializer):
        serializer.save(company=self.request.user)

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        item = self.get_object()
        item.is_archived = True
        item.save()
        return Response({'status': 'archived'})

    @action(detail=True, methods=['post'])
    def unarchive(self, request, pk=None):
        item = self.get_object()
        item.is_archived = False
        item.save()
        return Response({'status': 'active'})


class SnapshotViewSet(viewsets.ModelViewSet):
    """Create/list snapshots (versions) for main products."""
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options', 'delete']

    def get_queryset(self):
        return Snapshot.objects.filter(company=self.request.user).select_related('main_product')

    def get_serializer_class(self):
        if self.action == 'create':
            return SnapshotCreateSerializer
        return SnapshotSerializer

    def create(self, request, *args, **kwargs):
        serializer = SnapshotCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        snapshot = serializer.save()
        return Response(SnapshotSerializer(snapshot).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def rename(self, request, pk=None):
        """Rename a snapshot (human-friendly version label)."""
        snapshot = self.get_object()
        name = request.data.get('name', '')
        snapshot.name = name
        snapshot.save(update_fields=['name'])
        return Response(SnapshotSerializer(snapshot).data, status=status.HTTP_200_OK)


class DigitalTwinViewSet(viewsets.ModelViewSet):
    """CRUD for twins generated from snapshots."""
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return DigitalTwin.objects.filter(company=self.request.user).select_related('snapshot', 'snapshot__main_product')

    def get_serializer_class(self):
        if self.action == 'batch_create':
            return DigitalTwinCreateSerializer
        return DigitalTwinSerializer

    @action(detail=False, methods=['post'])
    def batch_create(self, request):
        """Batch create twins from a snapshot."""
        serializer = DigitalTwinCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        twins = serializer.save()
        return Response({
            'message': f'{len(twins)} twins créés avec succès',
            'twins': DigitalTwinSerializer(twins, many=True).data
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def regenerate_qr(self, request, pk=None):
        twin = self.get_object()
        twin.generate_qr_code()
        twin.save()
        return Response({
            'message': 'QR code régénéré',
            'qr_code': request.build_absolute_uri(twin.qr_code.url) if twin.qr_code else None
        })


class PublicDigitalTwinViewSet(viewsets.ReadOnlyModelViewSet):
    """Public view of twins (no auth)."""
    queryset = DigitalTwin.objects.all().select_related('snapshot', 'snapshot__main_product')
    serializer_class = PublicDigitalTwinSerializer
    permission_classes = [permissions.AllowAny]

    def retrieve(self, request, pk=None):
        twin = get_object_or_404(DigitalTwin, pk=pk)
        serializer = self.get_serializer(twin)
        return Response(serializer.data)


class SupplierLinkViewSet(viewsets.ModelViewSet):
    """Brand-facing magic link management."""
    serializer_class = SupplierLinkSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']

    def get_queryset(self):
        return SupplierLink.objects.filter(company=self.request.user).select_related('component')

    def get_serializer_class(self):
        if self.action == 'create':
            return SupplierLinkCreateSerializer
        return SupplierLinkSerializer

    def create(self, request, *args, **kwargs):
        serializer = SupplierLinkCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        component = serializer.validated_data['component']
        if component.company != request.user:
            return Response({'error': 'Ce composant ne vous appartient pas.'}, status=status.HTTP_403_FORBIDDEN)

        link = serializer.save()
        return Response(SupplierLinkSerializer(link).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def revoke(self, request, pk=None):
        link = self.get_object()
        link.is_revoked = True
        link.save()
        return Response({'status': 'revoked'})


class PublicSupplierLinkView(APIView):
    permission_classes = [permissions.AllowAny]

    def _get_link_or_error(self, token):
        link = get_object_or_404(SupplierLink, token=token)

        if link.submitted_at:
            return None, Response({'error': 'Ce lien a déjà été utilisé.', 'reason': 'submitted'}, status=status.HTTP_410_GONE)
        if link.is_revoked:
            return None, Response({'error': 'Ce lien a été révoqué.', 'reason': 'revoked'}, status=status.HTTP_410_GONE)
        if link.expires_at < timezone.now():
            return None, Response({'error': 'Ce lien a expiré.', 'reason': 'expired'}, status=status.HTTP_410_GONE)

        return link, None

    def get(self, request, token):
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

        if not link.is_password_protected:
            data['authenticated'] = True
        else:
            data['authenticated'] = False
            data['fields_to_fill'] = None

        return Response(data)


class PublicSupplierVerifyPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, token):
        link = get_object_or_404(SupplierLink, token=token)

        if not link.is_valid:
            return Response({'error': 'Ce lien n\'est plus valide.'}, status=status.HTTP_410_GONE)

        password = request.data.get('password', '')
        if not link.check_password(password):
            return Response({'error': 'Mot de passe incorrect.'}, status=status.HTTP_403_FORBIDDEN)

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
    permission_classes = [permissions.AllowAny]

    def post(self, request, token):
        link = get_object_or_404(SupplierLink, token=token)

        if not link.is_valid:
            return Response({'error': 'Ce lien n\'est plus valide.'}, status=status.HTTP_410_GONE)

        if link.is_password_protected:
            password = request.data.get('password', '')
            if not link.check_password(password):
                return Response({'error': 'Mot de passe incorrect.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = SupplierSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        component = link.component
        data = serializer.validated_data

        for field in ['name', 'description', 'manufacturer', 'material_composition',
                      'certifications', 'origin_country', 'gtin']:
            if field in data:
                setattr(component, field, data[field])

        # New workflow: mark as supplier submitted, keep editable
        component.supplier_submitted = True
        component.save()

        link.submitted_at = timezone.now()
        if data.get('supplier_email'):
            link.supplier_email = data['supplier_email']
        link.save()

        return Response({'message': 'Informations soumises avec succès. Merci !'})
