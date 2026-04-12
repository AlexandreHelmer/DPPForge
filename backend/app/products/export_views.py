"""
Export / Import views for user data.
- ZIP export: all user data in a single archive
- CSV export/import per entity (components, products, digital twins, supplier links)
"""
import csv
import io
import json
import zipfile
from datetime import datetime

from django.http import HttpResponse
from rest_framework import permissions, status
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Item, Snapshot, DigitalTwin, SupplierLink


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_csv_response(filename, header, rows):
    """Build an HttpResponse containing a UTF-8 CSV file."""
    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    # BOM for Excel compatibility
    response.write('\ufeff')
    writer = csv.writer(response, delimiter=';')
    writer.writerow(header)
    for row in rows:
        writer.writerow(row)
    return response


def _json_col(value):
    """Serialize a dict/list to a JSON string for CSV cells."""
    if value is None:
        return ''
    return json.dumps(value, ensure_ascii=False)


def _parse_json_col(value):
    """Deserialize a JSON string from a CSV cell back to a Python object."""
    if not value or value.strip() == '':
        return None
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return None


def _validate_csv_headers(reader, expected_header):
    """
    Validate that the CSV reader has exactly the expected columns.
    Returns (True, None) or (False, error_message).
    """
    actual = reader.fieldnames
    if actual is None:
        return False, "Le fichier CSV est vide ou ne contient pas d'en-têtes."

    # Strip whitespace from actual headers
    actual_clean = [h.strip() for h in actual]
    expected_set = set(expected_header)
    actual_set = set(actual_clean)

    missing = expected_set - actual_set
    extra = actual_set - expected_set

    if missing or extra:
        parts = []
        if missing:
            parts.append(f"Colonnes manquantes : {', '.join(sorted(missing))}")
        if extra:
            parts.append(f"Colonnes en trop : {', '.join(sorted(extra))}")
        expected_str = ' ; '.join(expected_header)
        parts.append(f"Format attendu : {expected_str}")
        return False, ' | '.join(parts)

    return True, None


# ---------------------------------------------------------------------------
# CSV column definitions
# ---------------------------------------------------------------------------

COMPONENT_HEADER = [
    'name', 'description', 'manufacturer', 'material_composition',
    'certifications', 'origin_country', 'gtin',
]

PRODUCT_HEADER = [
    'name', 'description', 'gtin', 'category', 'brand',
    'model_number', 'material_composition', 'certifications', 'status',
]

TWIN_HEADER = [
    'product_name', 'product_gtin', 'serial_number',
    'manufacturing_date', 'production_batch', 'notes', 'created_at',
]

SUPPLIER_LINK_HEADER = [
    'component_name', 'supplier_email', 'is_password_protected',
    'is_revoked', 'expires_at', 'submitted_at', 'created_at',
]


# ---------------------------------------------------------------------------
# Row builders
# ---------------------------------------------------------------------------

def _component_rows(qs):
    for c in qs:
        yield [
            c.name, c.description, c.manufacturer,
            _json_col(c.material_composition),
            _json_col(c.certifications),
            c.origin_country, c.gtin,
        ]


def _product_rows(qs):
    for p in qs:
        yield [
            p.name, p.description, p.gtin, '', '',
            '',
            _json_col(p.material_composition),
            _json_col(p.certifications),
            'CURRENT',
        ]


def _twin_rows(qs):
    for t in qs:
        yield [
            t.snapshot.main_product.name,
            t.snapshot.main_product.gtin,
            t.serial_number,
            t.manufacturing_date or '', t.production_batch, t.notes,
            t.created_at.isoformat(),
        ]


def _supplier_link_rows(qs):
    for sl in qs:
        yield [
            sl.component.name, sl.supplier_email or '',
            'oui' if sl.is_password_protected else 'non',
            'oui' if sl.is_revoked else 'non',
            sl.expires_at.isoformat(),
            sl.submitted_at.isoformat() if sl.submitted_at else '',
            sl.created_at.isoformat(),
        ]


# ===================================================================
#  ZIP EXPORT — all user data (oldest first)
# ===================================================================

class ExportAllZipView(APIView):
    """Export all user data as a ZIP archive."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        now_str = datetime.now().strftime('%Y%m%d_%H%M')

        # Prepare in-memory ZIP
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
            # 1. Account info (JSON)
            account_data = {
                'email': user.email,
                'company_name': user.company_name,
                'company_registration': user.company_registration,
                'status': user.status,
                'created_at': user.created_at.isoformat(),
                'updated_at': user.updated_at.isoformat(),
            }
            zf.writestr('compte.json', json.dumps(account_data, indent=2, ensure_ascii=False))

            # 2. Components CSV (oldest first)
            zf.writestr('composants.csv', self._build_csv(
                COMPONENT_HEADER,
                _component_rows(Item.objects.filter(company=user, is_main_product=False).order_by('created_at'))
            ))

            # 3. Products CSV (oldest first)
            zf.writestr('produits.csv', self._build_csv(
                PRODUCT_HEADER,
                _product_rows(Item.objects.filter(company=user, is_main_product=True).order_by('created_at'))
            ))

            # 4. Digital Twins CSV (oldest first)
            zf.writestr('digital_twins.csv', self._build_csv(
                TWIN_HEADER,
                _twin_rows(
                    DigitalTwin.objects.filter(company=user)
                    .select_related('snapshot', 'snapshot__main_product').order_by('created_at')
                )
            ))

            # 5. Supplier Links CSV (oldest first)
            zf.writestr('liens_fournisseurs.csv', self._build_csv(
                SUPPLIER_LINK_HEADER,
                _supplier_link_rows(
                    SupplierLink.objects.filter(company=user)
                    .select_related('component').order_by('created_at')
                )
            ))

        buf.seek(0)
        response = HttpResponse(buf.read(), content_type='application/zip')
        response['Content-Disposition'] = f'attachment; filename="dppforge_export_{now_str}.zip"'
        return response

    @staticmethod
    def _build_csv(header, rows):
        output = io.StringIO()
        output.write('\ufeff')  # BOM
        writer = csv.writer(output, delimiter=';')
        writer.writerow(header)
        for row in rows:
            writer.writerow(row)
        return output.getvalue()


# ===================================================================
#  CSV EXPORTS (oldest first)
# ===================================================================

class ExportComponentsCsvView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = Item.objects.filter(company=request.user, is_main_product=False).order_by('created_at')
        return _make_csv_response('composants.csv', COMPONENT_HEADER, _component_rows(qs))


class ExportProductsCsvView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = Item.objects.filter(company=request.user, is_main_product=True).order_by('created_at')
        return _make_csv_response('produits.csv', PRODUCT_HEADER, _product_rows(qs))


class ExportDigitalTwinsCsvView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = DigitalTwin.objects.filter(
            company=request.user
        ).select_related('snapshot', 'snapshot__main_product').order_by('created_at')
        return _make_csv_response('digital_twins.csv', TWIN_HEADER, _twin_rows(qs))


class ExportSupplierLinksCsvView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = SupplierLink.objects.filter(
            company=request.user
        ).select_related('component').order_by('created_at')
        return _make_csv_response('liens_fournisseurs.csv', SUPPLIER_LINK_HEADER, _supplier_link_rows(qs))


# ===================================================================
#  CSV IMPORTS (with strict header validation)
# ===================================================================

class ImportComponentsCsvView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request):
        csv_file = request.FILES.get('file')
        if not csv_file:
            return Response({'error': 'Aucun fichier fourni.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            decoded = csv_file.read().decode('utf-8-sig')
            reader = csv.DictReader(io.StringIO(decoded), delimiter=';')
        except Exception:
            return Response({'error': 'Impossible de lire le fichier CSV.'}, status=status.HTTP_400_BAD_REQUEST)

        # Strict header validation
        valid, err_msg = _validate_csv_headers(reader, COMPONENT_HEADER)
        if not valid:
            return Response({'error': err_msg}, status=status.HTTP_400_BAD_REQUEST)

        created = 0
        errors = []

        for i, row in enumerate(reader, start=2):  # line 1 = header
            name = (row.get('name') or '').strip()
            if not name:
                errors.append(f'Ligne {i} : nom manquant, ligne ignorée.')
                continue

            try:
                Component.objects.create(
                    company=request.user,
                    is_main_product=False,
                    name=name,
                    description=(row.get('description') or '').strip(),
                    manufacturer=(row.get('manufacturer') or '').strip(),
                    material_composition=_parse_json_col(row.get('material_composition')) or {},
                    certifications=_parse_json_col(row.get('certifications')) or [],
                    origin_country=(row.get('origin_country') or '').strip(),
                    gtin=(row.get('gtin') or '').strip(),
                )
                created += 1
            except Exception as exc:
                errors.append(f'Ligne {i} : {str(exc)[:120]}')

        return Response({
            'message': f'{created} composant(s) importé(s) avec succès.',
            'created': created,
            'errors': errors,
        })


class ImportProductsCsvView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request):
        csv_file = request.FILES.get('file')
        if not csv_file:
            return Response({'error': 'Aucun fichier fourni.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            decoded = csv_file.read().decode('utf-8-sig')
            reader = csv.DictReader(io.StringIO(decoded), delimiter=';')
        except Exception:
            return Response({'error': 'Impossible de lire le fichier CSV.'}, status=status.HTTP_400_BAD_REQUEST)

        # Strict header validation
        valid, err_msg = _validate_csv_headers(reader, PRODUCT_HEADER)
        if not valid:
            return Response({'error': err_msg}, status=status.HTTP_400_BAD_REQUEST)

        created = 0
        errors = []

        for i, row in enumerate(reader, start=2):
            name = (row.get('name') or '').strip()
            if not name:
                errors.append(f'Ligne {i} : nom manquant, ligne ignorée.')
                continue

            gtin_val = (row.get('gtin') or '').strip() or None

            # Check for GTIN duplicate before attempting create
            if gtin_val and Item.objects.filter(gtin=gtin_val, is_main_product=True).exists():
                errors.append(f'Ligne {i} : le GTIN « {gtin_val} » existe déjà, ligne ignorée.')
                continue

            try:
                Item.objects.create(
                    company=request.user,
                    is_main_product=True,
                    name=name,
                    description=(row.get('description') or '').strip(),
                    gtin=gtin_val,
                    # These columns may exist in CSV; Item keeps them inside payload-only
                    # for now they are ignored (kept for backward compatibility).
                    material_composition=_parse_json_col(row.get('material_composition')) or {},
                    certifications=_parse_json_col(row.get('certifications')) or [],
                )
                created += 1
            except Exception as exc:
                # Make Django DB errors more readable
                msg = str(exc)
                if 'UNIQUE constraint' in msg or 'unique' in msg.lower():
                    errors.append(f'Ligne {i} : doublon détecté (GTIN ou autre contrainte unique).')
                else:
                    errors.append(f'Ligne {i} : {msg[:120]}')

        return Response({
            'message': f'{created} produit(s) importé(s) avec succès.',
            'created': created,
            'errors': errors,
        })
