from rest_framework import serializers
from .models import Component, Product, ProductInstance


class ComponentSerializer(serializers.ModelSerializer):
    """
    Serializer for Component model.
    """
    company_name = serializers.CharField(source='company.company_name', read_only=True)
    
    class Meta:
        model = Component
        fields = [
            'id', 'company', 'company_name', 'name', 'description',
            'manufacturer', 'material_composition', 'certifications',
            'origin_country', 'gtin', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'company', 'created_at', 'updated_at']
        extra_kwargs = {
            'description': {'required': False},
            'manufacturer': {'required': False},
            'material_composition': {'required': False},
            'certifications': {'required': False},
            'origin_country': {'required': False},
            'gtin': {'required': False},
        }
    
    def create(self, validated_data):
        # Auto-assign company from request user
        validated_data['company'] = self.context['request'].user
        return super().create(validated_data)


class ProductListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for product listing.
    """
    company_name = serializers.CharField(source='company.company_name', read_only=True)
    component_count = serializers.SerializerMethodField()
    instance_count = serializers.SerializerMethodField()
    is_complete = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = [
            'id', 'company', 'company_name', 'name', 'gtin',
            'status', 'category', 'brand', 'is_archived', 'component_count',
            'instance_count', 'is_complete', 'created_at'
        ]
    
    def get_component_count(self, obj):
        return obj.components.count()
    
    def get_instance_count(self, obj):
        return obj.instances.count()
    
    def get_is_complete(self, obj):
        return obj.is_complete()


class ProductSerializer(serializers.ModelSerializer):
    """
    Detailed serializer for Product model.
    """
    company_name = serializers.CharField(source='company.company_name', read_only=True)
    components_detail = ComponentSerializer(source='components', many=True, read_only=True)
    is_complete = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = [
            'id', 'company', 'company_name', 'name', 'description',
            'gtin', 'components', 'components_detail', 'status',
            'category', 'brand', 'model_number', 'is_archived',
            'json_ld', 'is_complete', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'company', 'json_ld', 'created_at', 'updated_at']
        extra_kwargs = {
            'description': {'required': False},
            'gtin': {'required': False},
            'category': {'required': False},
            'brand': {'required': False},
            'model_number': {'required': False},
            'components': {'required': False},
        }
    
    def get_is_complete(self, obj):
        return obj.is_complete()
    
    def create(self, validated_data):
        # Auto-assign company from request user
        validated_data['company'] = self.context['request'].user
        components = validated_data.pop('components', [])
        product = Product.objects.create(**validated_data)
        product.components.set(components)
        return product


class ProductInstanceSerializer(serializers.ModelSerializer):
    """
    Serializer for ProductInstance model.
    """
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_gtin = serializers.CharField(source='product.gtin', read_only=True)
    public_url = serializers.CharField(source='get_public_url', read_only=True)
    
    class Meta:
        model = ProductInstance
        fields = [
            'id', 'product', 'product_name', 'product_gtin',
            'serial_number', 'manufacturing_date', 'production_batch', 'notes',
            'qr_code', 'public_url', 'created_at'
        ]
        read_only_fields = ['id', 'qr_code', 'created_at']


class ProductInstanceCreateSerializer(serializers.Serializer):
    """
    Serializer for batch creating product instances.
    """
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all())
    quantity = serializers.IntegerField(min_value=1, max_value=1000)
    production_batch = serializers.CharField(max_length=100, required=False, allow_blank=True)
    serial_number_prefix = serializers.CharField(max_length=50, required=False, default='SN')
    
    def create(self, validated_data):
        """
        Create multiple product instances with auto-generated serial numbers.
        """
        product = validated_data['product']
        quantity = validated_data['quantity']
        production_batch = validated_data.get('production_batch', '')
        prefix = validated_data.get('serial_number_prefix', 'SN')
        
        # Get number of existing instances to continue the sequence
        # We look for serials starting with prefix and gtin
        # and count them to determine the next index
        prefix_pattern = f"{prefix}-{product.gtin}-"
        existing_count = ProductInstance.objects.filter(
            product=product,
            serial_number__startswith=prefix_pattern
        ).count()

        instances = []
        for i in range(quantity):
            # Using existing_count + i + 1 ensures uniqueness if using same prefix
            serial = f"{prefix_pattern}{existing_count + i + 1:05d}"
            instance = ProductInstance.objects.create(
                product=product,
                serial_number=serial,
                production_batch=production_batch
            )
            instance.generate_qr_code()
            instance.save()
            instances.append(instance)
        
        return instances


class PublicProductInstanceSerializer(serializers.ModelSerializer):
    """
    Public serializer for viewing product digital twin.
    Shows product information and JSON-LD passport.
    """
    product_data = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductInstance
        fields = ['id', 'serial_number', 'product_data', 'created_at']
    
    def get_product_data(self, obj):
        return {
            'name': obj.product.name,
            'description': obj.product.description,
            'gtin': obj.product.gtin,
            'brand': obj.product.brand,
            'category': obj.product.category,
            'model': obj.product.model_number,
            'manufacturer': obj.product.company.company_name,
            'manufacturing_date': obj.manufacturing_date,
            'json_ld': obj.product.json_ld,
            'components': ComponentSerializer(obj.product.components.all(), many=True).data
        }
