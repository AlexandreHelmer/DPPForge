from django.db import models
from django.conf import settings
import uuid
import json


class Component(models.Model):
    """
    Represents a component that can be part of a product.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='components',
        verbose_name='Entreprise'
    )
    
    name = models.CharField(max_length=255, verbose_name='Nom du composant')
    description = models.TextField(blank=True, verbose_name='Description')
    manufacturer = models.CharField(max_length=255, blank=True, verbose_name='Fabricant')
    
    # Material composition as JSON
    material_composition = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Composition matérielle',
        help_text='Ex: {"plastic": 60, "metal": 30, "glass": 10}'
    )
    
    # Certifications as JSON array
    certifications = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Certifications',
        help_text='Ex: ["CE", "RoHS", "REACH"]'
    )
    
    # Additional properties for EU DPP compliance
    origin_country = models.CharField(max_length=100, blank=True, verbose_name='Pays d\'origine')
    gtin = models.CharField(
        max_length=14,
        blank=True,
        verbose_name='GTIN',
        help_text='Global Trade Item Number'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Composant'
        verbose_name_plural = 'Composants'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.company.company_name})"


class Product(models.Model):
    """
    Represents a product composed of components.
    Generates EU-compliant JSON-LD Digital Product Passport.
    """
    STATUS_CHOICES = [
        ('DRAFT', 'Brouillon'),
        ('COMPLETE', 'Complet'),
        ('LOCKED', 'Verrouillé'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='products',
        verbose_name='Entreprise'
    )
    
    name = models.CharField(max_length=255, verbose_name='Nom du produit')
    description = models.TextField(blank=True, verbose_name='Description')
    
    gtin = models.CharField(
        max_length=14,
        unique=True,
        null=True,
        blank=True,
        verbose_name='GTIN',
        help_text='Global Trade Item Number - unique identifier'
    )
    
    components = models.ManyToManyField(
        Component,
        related_name='products',
        blank=True,
        verbose_name='Composants'
    )
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='DRAFT',
        verbose_name='Statut'
    )
    
    # EU DPP specific fields
    category = models.CharField(max_length=100, blank=True, verbose_name='Catégorie')
    brand = models.CharField(max_length=100, blank=True, verbose_name='Marque')
    model_number = models.CharField(max_length=100, blank=True, verbose_name='Numéro de modèle')
    
    # Store the generated JSON-LD
    json_ld = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='JSON-LD DPP',
        help_text='Digital Product Passport au format JSON-LD'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_archived = models.BooleanField(default=False, verbose_name='Archivé')
    
    class Meta:
        verbose_name = 'Produit'
        verbose_name_plural = 'Produits'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} - {self.gtin or 'SANS GTIN'}"
    
    def is_complete(self):
        """
        Check if product has minimum required information for EU DPP validation.
        """
        # Minimum fields required to move from DRAFT to COMPLETE/LOCKED
        # Note: GTIN is technically mandatory for EU DPP
        required_fields = [
            self.name,
            self.gtin,
            self.category,
            self.brand,
        ]
        return all(required_fields) and self.components.exists()
    
    def generate_json_ld(self):
        """
        Generate EU-compliant JSON-LD Digital Product Passport.
        Based on EU DPP Regulation (EU) 2023/1542.
        """
        components_data = []
        for component in self.components.all():
            components_data.append({
                "@type": "Product",
                "name": component.name,
                "description": component.description,
                "manufacturer": {
                    "@type": "Organization",
                    "name": component.manufacturer
                },
                "material": component.material_composition,
                "countryOfOrigin": component.origin_country,
                "gtin": component.gtin,
                "certifications": component.certifications
            })
        
        json_ld_data = {
            "@context": "https://schema.org",
            "@type": "Product",
            "@id": f"urn:dpp:{self.gtin}",
            "gtin": self.gtin,
            "name": self.name,
            "description": self.description,
            "brand": {
                "@type": "Brand",
                "name": self.brand
            },
            "manufacturer": {
                "@type": "Organization",
                "name": self.company.company_name,
                "identifier": self.company.company_registration
            },
            "category": self.category,
            "model": self.model_number,
            "hasPart": components_data,
            "additionalProperty": [
                {
                    "@type": "PropertyValue",
                    "name": "Digital Product Passport",
                    "value": "EU Compliant",
                    "description": "Conforme au règlement UE 2023/1542"
                }
            ]
        }
        
        self.json_ld = json_ld_data
        return json_ld_data
    
    def save(self, *args, **kwargs):
        if self.gtin == "":
            self.gtin = None
            
        # Auto-update status if it was draft and now it's complete
        if self.status == 'DRAFT' and self.is_complete():
            self.status = 'COMPLETE'
            
        # Generate JSON-LD if status is COMPLETE or LOCKED
        if self.status in ['COMPLETE', 'LOCKED']:
            self.generate_json_ld()
            
        super().save(*args, **kwargs)


class ProductInstance(models.Model):
    """
    Represents a specific instance of a product (digital twin).
    Each instance has a unique serial number and QR code.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='instances',
        verbose_name='Produit'
    )
    
    serial_number = models.CharField(
        max_length=100,
        unique=True,
        verbose_name='Numéro de série'
    )
    
    manufacturing_date = models.DateField(null=True, blank=True, verbose_name='Date de fabrication réelle')
    
    qr_code = models.ImageField(
        upload_to='qr_codes/',
        blank=True,
        null=True,
        verbose_name='QR Code'
    )
    
    # Additional tracking
    production_batch = models.CharField(max_length=100, blank=True, verbose_name='Lot de production')
    notes = models.TextField(blank=True, verbose_name='Notes')
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Date de création')
    
    class Meta:
        verbose_name = 'Instance de Produit'
        verbose_name_plural = 'Instances de Produit'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.product.name} - {self.serial_number}"
    
    def get_public_url(self):
        """
        Generate the public URL for viewing this product instance.
        """
        from django.conf import settings
        # Will be accessible at /public/twin/<uuid>/
        return f"{settings.FRONTEND_URL}/twin/{self.id}"
    
    def generate_qr_code(self):
        """
        Generate QR code pointing to the public URL.
        """
        import qrcode
        from io import BytesIO
        from django.core.files import File
        
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(self.get_public_url())
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        
        filename = f'qr_{self.serial_number}.png'
        self.qr_code.save(filename, File(buffer), save=False)
        
        return self.qr_code
