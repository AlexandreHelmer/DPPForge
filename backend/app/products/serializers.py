from rest_framework import serializers
from .models import Item, Snapshot, DigitalTwin, SupplierLink, _serialize_item_tree


class ItemSerializer(serializers.ModelSerializer):
    """Serializer for current (editable) Items."""
    company_name = serializers.CharField(source='company.company_name', read_only=True)

    class Meta:
        model = Item
        fields = [
            'id', 'company', 'company_name',
            'name', 'description', 'manufacturer',
            'is_main_product',
            'supplier', 'supplier_submitted',
            'brand', 'category', 'model_number',
            'material_composition', 'certifications',
            'origin_country', 'gtin',
            'components',
            'is_archived',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'company', 'supplier_submitted', 'created_at', 'updated_at']

    def update(self, instance, validated_data):
        # Ensure M2M (components) is applied on PUT/PATCH
        components = validated_data.pop('components', None)
        instance = super().update(instance, validated_data)
        if components is not None:
            instance.components.set(components)
        return instance

    def create(self, validated_data):
        validated_data['company'] = self.context['request'].user
        return super().create(validated_data)


class ItemListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for item listing."""
    company_name = serializers.CharField(source='company.company_name', read_only=True)
    component_count = serializers.SerializerMethodField()
    snapshot_count = serializers.SerializerMethodField()
    usage_count = serializers.SerializerMethodField()

    class Meta:
        model = Item
        fields = [
            'id', 'company', 'company_name',
            'name', 'gtin',
            'description',
            'manufacturer',
            'origin_country',
            'is_main_product',
            'supplier', 'supplier_submitted',
            'brand', 'category', 'model_number',
            'material_composition',
            'certifications',
            'is_archived',
            'usage_count',
            'component_count', 'snapshot_count',
            'created_at', 'updated_at',
        ]

    def get_component_count(self, obj):
        return obj.components.count()

    def get_snapshot_count(self, obj):
        return obj.snapshots.count()

    def get_usage_count(self, obj):
        # Number of parent items that include this item as a component.
        # Note: includes both products and components.
        return obj.used_in.count()


class SnapshotSerializer(serializers.ModelSerializer):
    """Serializer for immutable snapshots."""
    main_product_name = serializers.CharField(source='main_product.name', read_only=True)

    class Meta:
        model = Snapshot
        fields = ['id', 'company', 'main_product', 'main_product_name', 'name', 'created_at', 'payload']
        read_only_fields = ['id', 'company', 'created_at', 'payload']


class SnapshotCreateSerializer(serializers.Serializer):
    """Create a snapshot from a main product (Item)."""
    main_product = serializers.PrimaryKeyRelatedField(queryset=Item.objects.all())
    name = serializers.CharField(max_length=255, required=False, allow_blank=True)

    def create(self, validated_data):
        main_product = validated_data['main_product']
        name = validated_data.get('name', '')
        request = self.context['request']

        # Basic ownership guard
        if main_product.company_id != request.user.id:
            raise serializers.ValidationError("Not allowed")

        payload = _serialize_item_tree(main_product)

        snapshot = Snapshot.objects.create(
            company=request.user,
            main_product=main_product,
            name=name,
            payload=payload,
        )
        return snapshot


class DigitalTwinSerializer(serializers.ModelSerializer):
    """Serializer for twins generated from snapshots."""
    main_product_name = serializers.CharField(source='snapshot.main_product.name', read_only=True)
    public_url = serializers.CharField(source='get_public_url', read_only=True)

    class Meta:
        model = DigitalTwin
        fields = [
            'id', 'company',
            'snapshot', 'main_product_name',
            'serial_number', 'manufacturing_date',
            'production_batch', 'notes',
            'qr_code', 'public_url',
            'created_at'
        ]
        read_only_fields = ['id', 'company', 'qr_code', 'created_at', 'public_url']


class DigitalTwinCreateSerializer(serializers.Serializer):
    """Batch-create twins from a snapshot."""
    snapshot = serializers.PrimaryKeyRelatedField(queryset=Snapshot.objects.all())
    quantity = serializers.IntegerField(min_value=1, max_value=1000)
    production_batch = serializers.CharField(max_length=100, required=False, allow_blank=True)
    serial_number_prefix = serializers.CharField(max_length=50, required=False, default='SN')

    def create(self, validated_data):
        snapshot = validated_data['snapshot']
        quantity = validated_data['quantity']
        production_batch = validated_data.get('production_batch', '')
        prefix = validated_data.get('serial_number_prefix', 'SN')

        request = self.context['request']
        if snapshot.company_id != request.user.id:
            raise serializers.ValidationError("Not allowed")

        base = snapshot.main_product.gtin or snapshot.main_product.id
        prefix_pattern = f"{prefix}-{base}-"

        existing_count = DigitalTwin.objects.filter(
            snapshot=snapshot,
            serial_number__startswith=prefix_pattern
        ).count()

        twins = []
        for i in range(quantity):
            serial = f"{prefix_pattern}{existing_count + i + 1:05d}"
            twin = DigitalTwin.objects.create(
                company=request.user,
                snapshot=snapshot,
                serial_number=serial,
                production_batch=production_batch,
            )
            twin.generate_qr_code()
            twin.save()
            twins.append(twin)
        return twins


class PublicDigitalTwinSerializer(serializers.ModelSerializer):
    """Public view of a twin: uses snapshot payload + manufacturing fields."""
    snapshot_payload = serializers.JSONField(source='snapshot.payload', read_only=True)

    class Meta:
        model = DigitalTwin
        fields = ['id', 'serial_number', 'manufacturing_date', 'snapshot_payload', 'created_at']


class SupplierLinkSerializer(serializers.ModelSerializer):
    component_name = serializers.CharField(source='component.name', read_only=True)
    is_valid = serializers.BooleanField(read_only=True)
    is_password_protected = serializers.BooleanField(read_only=True)
    link_url = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = SupplierLink
        fields = [
            'id', 'token', 'component', 'component_name',
            'is_password_protected', 'is_valid', 'link_url', 'status',
            'expires_at', 'is_revoked', 'supplier_email',
            'created_at', 'submitted_at', 'updated_at'
        ]
        read_only_fields = ['id', 'token', 'is_revoked', 'created_at', 'submitted_at', 'updated_at']

    def get_link_url(self, obj):
        from django.conf import settings
        return f"{settings.FRONTEND_URL}/supplier/{obj.token}"

    def get_status(self, obj):
        from django.utils import timezone
        if obj.submitted_at:
            return 'submitted'
        if obj.is_revoked:
            return 'revoked'
        if obj.expires_at < timezone.now():
            return 'expired'
        return 'active'


class SupplierLinkCreateSerializer(serializers.Serializer):
    component = serializers.PrimaryKeyRelatedField(queryset=Item.objects.all())
    password = serializers.CharField(required=False, allow_blank=True, write_only=True)
    expires_in_days = serializers.IntegerField(min_value=1, max_value=90, default=7)
    supplier_email = serializers.EmailField(required=False, allow_blank=True)

    def create(self, validated_data):
        from django.utils import timezone
        from datetime import timedelta
        import secrets

        component = validated_data['component']
        password = validated_data.get('password', '')
        expires_in_days = validated_data.get('expires_in_days', 7)
        supplier_email = validated_data.get('supplier_email', '')

        link = SupplierLink(
            token=secrets.token_urlsafe(32),
            component=component,
            company=self.context['request'].user,
            expires_at=timezone.now() + timedelta(days=expires_in_days),
            supplier_email=supplier_email or None,
        )

        if password:
            link.set_password(password)

        link.save()
        return link


class SupplierSubmitSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    manufacturer = serializers.CharField(max_length=255, required=False, allow_blank=True)
    material_composition = serializers.JSONField(required=False)
    certifications = serializers.JSONField(required=False)
    origin_country = serializers.CharField(max_length=100, required=False, allow_blank=True)
    gtin = serializers.CharField(max_length=14, required=False, allow_blank=True)
    supplier_email = serializers.EmailField(required=False, allow_blank=True)
