from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta
from products.models import Item, DigitalTwin


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """
    Get dashboard statistics for the authenticated company.
    Returns:
    - Total products, components, product instances
    - Products by status
    - QR codes generated (today, this month, total)
    - Recent activity
    """
    user = request.user
    
    # Basic counts
    total_products = Item.objects.filter(company=user, is_main_product=True).count()
    total_components = Item.objects.filter(company=user, is_main_product=False).count()
    total_instances = DigitalTwin.objects.filter(company=user).count()
    
    # QR codes generated
    today = timezone.now().date()
    month_start = today.replace(day=1)
    
    qr_today = DigitalTwin.objects.filter(company=user, created_at__date=today).count()
    
    qr_this_month = DigitalTwin.objects.filter(company=user, created_at__date__gte=month_start).count()
    
    # Recent products
    recent_products = Item.objects.filter(company=user, is_main_product=True).order_by('-created_at')[:5]
    recent_products_data = [{
        'id': str(p.id),
        'name': p.name,
        'gtin': p.gtin,
        'created_at': p.created_at
    } for p in recent_products]
    
    # Complete vs incomplete: with snapshots, "complete" is approximated as "has at least 1 snapshot"
    complete_count = Item.objects.filter(company=user, is_main_product=True, snapshots__isnull=False).distinct().count()
    incomplete_count = total_products - complete_count
    
    return Response({
        'summary': {
            'total_products': total_products,
            'total_components': total_components,
            'total_instances': total_instances,
            'complete_products': complete_count,
            'incomplete_products': incomplete_count,
        },
        'products_by_status': {
            'draft': 0,
            'complete': 0,
            'locked': 0,
        },
        'qr_codes': {
            'today': qr_today,
            'this_month': qr_this_month,
            'total': total_instances,
        },
        'recent_products': recent_products_data,
    })
