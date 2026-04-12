from django.db import models
from django.conf import settings
import uuid
import json


class Item(models.Model):
    """\
    Current (editable) object.

    In the new schema: product == component.
    We keep a single table for both, with:
    - is_main_product: whether this item is meant to be a "main" product in the UI
    - supplier (nullable): optional supplier information
    - supplier_submitted: boolean flag set when a supplier submitted data (instead of locking)

    Composition is expressed via a self-referential M2M (components).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='components',
        verbose_name='Entreprise'
    )
    
    name = models.CharField(max_length=255, verbose_name="Nom")
    description = models.TextField(blank=True, verbose_name='Description')
    manufacturer = models.CharField(max_length=255, blank=True, verbose_name='Fabricant')

    # Product-only fields (kept optional so the same table can represent components)
    brand = models.CharField(max_length=100, blank=True, verbose_name='Marque')
    category = models.CharField(max_length=100, blank=True, verbose_name='Catégorie')
    model_number = models.CharField(max_length=100, blank=True, verbose_name='Numéro de modèle')

    # Whether this item is presented as a "main product" in the UI
    is_main_product = models.BooleanField(
        default=False,
        verbose_name='Produit principal'
    )

    # Supplier is optional / unknown in many cases
    supplier = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name='Fournisseur'
    )
    
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

    def save(self, *args, **kwargs):
        # Normalize empties
        if self.supplier == "":
            self.supplier = None
        if self.gtin == "":
            self.gtin = None
        super().save(*args, **kwargs)
    
    # Supplier workflow: submitted vs locked
    supplier_submitted = models.BooleanField(
        default=False,
        verbose_name='Soumis par le fournisseur'
    )
    is_archived = models.BooleanField(default=False, verbose_name='Archivé')

    components = models.ManyToManyField(
        'self',
        symmetrical=False,
        related_name='used_in',
        blank=True,
        verbose_name='Composants'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Item'
        verbose_name_plural = 'Items'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.company.company_name})"


class Snapshot(models.Model):
    """\
    Immutable deep copy (JSON) of a main product at a point in time.

    A snapshot includes the product data *and* its components recursively,
    serialized into a single JSON payload.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='snapshots',
        verbose_name='Entreprise'
    )

    main_product = models.ForeignKey(
        Item,
        on_delete=models.CASCADE,
        related_name='snapshots',
        verbose_name='Produit principal'
    )

    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Date de snapshot')

    name = models.CharField(
        max_length=255,
        blank=True,
        default='',
        verbose_name='Nom de version'
    )

    # Deep-copied payload (like a DPP template, without manufacturing date & serial)
    payload = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Payload (JSON)'
    )

    class Meta:
        verbose_name = 'Snapshot'
        verbose_name_plural = 'Snapshots'
        ordering = ['-created_at']

    def __str__(self):
        return f"Snapshot {self.main_product.name} @ {self.created_at:%Y-%m-%d %H:%M}"


def _serialize_item_tree(item: 'Item', visited=None):
    """Serialize an item and its components into a JSON-friendly dict."""
    if visited is None:
        visited = set()
    if item.id in visited:
        # Prevent cycles
        return {"id": str(item.id), "name": item.name, "cycle": True}
    visited.add(item.id)

    return {
        "id": str(item.id),
        "name": item.name,
        "description": item.description,
        "manufacturer": item.manufacturer,
        "supplier": item.supplier,
        "supplier_submitted": item.supplier_submitted,
        "origin_country": item.origin_country,
        "gtin": item.gtin,
        "category": getattr(item, 'category', ''),
        "brand": getattr(item, 'brand', ''),
        "model_number": getattr(item, 'model_number', ''),
        "material_composition": item.material_composition,
        "certifications": item.certifications,
        "components": [
            _serialize_item_tree(child, visited=visited) for child in item.components.all()
        ],
    }


class DigitalTwin(models.Model):
    """\
    Represents a specific instance of a product (digital twin).
    The QR code and UUID are specific to the twin, and each twin is generated
    from a Snapshot.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    company = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='twins',
        verbose_name='Entreprise'
    )

    snapshot = models.ForeignKey(
        Snapshot,
        on_delete=models.CASCADE,
        related_name='twins',
        verbose_name='Snapshot'
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
        verbose_name = 'Digital Twin'
        verbose_name_plural = 'Digital Twins'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.snapshot.main_product.name} - {self.serial_number}"

    def get_public_url(self):
        """Public URL used by the QR code."""
        from django.conf import settings
        return f"{settings.FRONTEND_URL}/twin/{self.id}"

    def generate_qr_code(self):
        """Generate a QR code pointing to the public URL."""
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


 


class SupplierLink(models.Model):
    """
    A magic link sent to a supplier to fill in component information.
    No account required — the supplier accesses via a unique token URL.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    token = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
        verbose_name='Token'
    )
    
    component = models.ForeignKey(
        Item,
        on_delete=models.CASCADE,
        related_name='supplier_links',
        verbose_name='Composant'
    )
    company = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='supplier_links',
        verbose_name='Entreprise'
    )
    
    # Optional password protection
    password_hash = models.CharField(
        max_length=256,
        blank=True,
        null=True,
        verbose_name='Hash du mot de passe'
    )
    
    # Validity
    expires_at = models.DateTimeField(verbose_name='Date d\'expiration')
    is_revoked = models.BooleanField(default=False, verbose_name='Révoqué')
    
    # Supplier info
    supplier_email = models.EmailField(
        blank=True,
        null=True,
        verbose_name='Email du fournisseur'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Date de soumission'
    )
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Lien fournisseur'
        verbose_name_plural = 'Liens fournisseur'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Lien pour {self.component.name} ({self.token[:8]}...)"
    
    def save(self, *args, **kwargs):
        if not self.token:
            import secrets
            self.token = secrets.token_urlsafe(32)
        super().save(*args, **kwargs)
    
    def set_password(self, raw_password):
        """Hash and store a password."""
        from django.contrib.auth.hashers import make_password
        self.password_hash = make_password(raw_password)
    
    def check_password(self, raw_password):
        """Check a password against the stored hash."""
        from django.contrib.auth.hashers import check_password
        if not self.password_hash:
            return True  # No password set
        return check_password(raw_password, self.password_hash)
    
    @property
    def is_password_protected(self):
        return bool(self.password_hash)
    
    @property
    def is_valid(self):
        """Check if the link is still valid (not expired, not revoked, not submitted)."""
        from django.utils import timezone
        if self.is_revoked:
            return False
        if self.submitted_at:
            return False
        if self.expires_at < timezone.now():
            return False
        return True
