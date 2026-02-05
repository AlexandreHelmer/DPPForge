from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta
from products.models import Product, Component, ProductInstance


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
    total_products = Product.objects.filter(company=user).count()
    total_components = Component.objects.filter(company=user).count()
    total_instances = ProductInstance.objects.filter(product__company=user).count()
    
    # Products by status
    products_by_status = Product.objects.filter(company=user).values('status').annotate(
        count=Count('id')
    )
    status_dict = {item['status']: item['count'] for item in products_by_status}
    
    # QR codes generated
    today = timezone.now().date()
    month_start = today.replace(day=1)
    
    qr_today = ProductInstance.objects.filter(
        product__company=user,
        created_at__date=today
    ).count()
    
    qr_this_month = ProductInstance.objects.filter(
        product__company=user,
        created_at__date__gte=month_start
    ).count()
    
    # Recent products
    recent_products = Product.objects.filter(company=user).order_by('-created_at')[:5]
    recent_products_data = [{
        'id': str(p.id),
        'name': p.name,
        'gtin': p.gtin,
        'status': p.status,
        'created_at': p.created_at
    } for p in recent_products]
    
    # Complete vs incomplete
    complete_count = Product.objects.filter(
        company=user,
        status__in=['COMPLETE', 'LOCKED']
    ).count()
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
            'draft': status_dict.get('DRAFT', 0),
            'complete': status_dict.get('COMPLETE', 0),
            'locked': status_dict.get('LOCKED', 0),
        },
        'qr_codes': {
            'today': qr_today,
            'this_month': qr_this_month,
            'total': total_instances,
        },
        'recent_products': recent_products_data,
    })
