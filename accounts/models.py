from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
import uuid


class CompanyManager(BaseUserManager):
    """
    Custom manager for Company model that uses email instead of username.
    """
    def create_user(self, email, company_name, password=None, **extra_fields):
        if not email:
            raise ValueError('L\'email est obligatoire')
        if not company_name:
            raise ValueError('Le nom de l\'entreprise est obligatoire')
        
        email = self.normalize_email(email)
        extra_fields.setdefault('username', email)  # Set username to email
        user = self.model(email=email, company_name=company_name, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, company_name, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('status', 'ACTIVE')
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Le superuser doit avoir is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Le superuser doit avoir is_superuser=True.')
        
        return self.create_user(email, company_name, password, **extra_fields)


class Company(AbstractUser):
    """
    Custom user model representing a company.
    Companies can create products and components.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Override username to make it optional (we use email for login)
    username = models.CharField(max_length=150, blank=True, null=True)
    email = models.EmailField(unique=True, verbose_name='Email')
    
    # Company-specific fields
    company_name = models.CharField(max_length=255, verbose_name='Nom de l\'entreprise')
    company_registration = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Numéro SIREN/SIRET'
    )
    
    # Status field
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('PENDING', 'En Attente'),
        ('SUSPENDED', 'Suspendu'),
    ]
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING',
        verbose_name='Statut'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Custom manager
    objects = CompanyManager()
    
    # Use email as the username field
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['company_name']
    
    class Meta:
        verbose_name = 'Entreprise'
        verbose_name_plural = 'Entreprises'
    
    def __str__(self):
        return f"{self.company_name} ({self.email})"
