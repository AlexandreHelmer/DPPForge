import React, { useState, useRef, useCallback } from 'react';
import { Modal, Button, Alert, Spinner, Tabs, Tab, Table, Badge } from 'react-bootstrap';
import { productsService } from '../services/products';

/**
 * Expected CSV columns per entity — must match the backend HEADER constants.
 */
const EXPECTED_COLUMNS = {
    components: ['name', 'description', 'manufacturer', 'material_composition', 'certifications', 'origin_country', 'gtin'],
    products: ['name', 'description', 'gtin', 'category', 'brand', 'model_number', 'material_composition', 'certifications', 'status'],
};

/**
 * Parse a CSV string with semicolon delimiter.
 * Returns { headers: string[], rows: string[][] }
 */
function parseCsv(text) {
    // Remove BOM if present
    const clean = text.replace(/^\uFEFF/, '');
    const lines = clean.split(/\r?\n/).filter(l => l.trim() !== '');
    if (lines.length === 0) return { headers: [], rows: [] };

    // Simple semicolon split (handles quoted fields with semicolons)
    const parseLine = (line) => {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (ch === ';' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += ch;
            }
        }
        result.push(current);
        return result;
    };

    const headers = parseLine(lines[0]).map(h => h.trim());
    const rows = lines.slice(1).map(l => parseLine(l));
    return { headers, rows };
}

/**
 * Reusable CSV Import/Export modal with preview flow.
 *
 * @param {boolean}  show        - Whether the modal is visible
 * @param {Function} onHide      - Called when the modal should close
 * @param {string}   entityName  - Human-readable entity name (e.g. "Composants")
 * @param {string}   entityPath  - API path segment (e.g. "components")
 * @param {boolean}  importable  - If false, only export is shown (default true)
 * @param {Function} onImportSuccess - Called after a successful import
 */
const CsvModal = ({
    show,
    onHide,
    entityName,
    entityPath,
    importable = true,
    onImportSuccess = null,
}) => {
    const [exporting, setExporting] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('export');

    // Preview state
    const [previewData, setPreviewData] = useState(null);   // { headers, rows, file, totalRows }
    const [headerError, setHeaderError] = useState('');

    const fileInputRef = useRef(null);

    const expectedCols = EXPECTED_COLUMNS[entityPath] || [];

    const resetImportState = useCallback(() => {
        setPreviewData(null);
        setHeaderError('');
        setImportResult(null);
        setError('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, []);

    // ------- EXPORT -------
    const handleExport = async () => {
        setExporting(true);
        setError('');
        try {
            await productsService.exportCsv(entityPath);
        } catch (err) {
            setError('Erreur lors de l\'export CSV.');
        } finally {
            setExporting(false);
        }
    };

    // ------- IMPORT STEP 1: parse & preview -------
    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError('');
        setHeaderError('');
        setImportResult(null);

        const reader = new FileReader();
        reader.onload = (evt) => {
            const text = evt.target.result;
            const { headers, rows } = parseCsv(text);

            if (headers.length === 0) {
                setHeaderError('Le fichier est vide ou ne contient pas d\'en-têtes.');
                return;
            }

            // Strict header validation
            const expectedSet = new Set(expectedCols);
            const actualSet = new Set(headers);
            const missing = expectedCols.filter(c => !actualSet.has(c));
            const extra = headers.filter(c => !expectedSet.has(c));

            if (missing.length > 0 || extra.length > 0) {
                let msg = 'Les colonnes du fichier ne correspondent pas au format attendu.';
                if (missing.length > 0) msg += ` Colonnes manquantes : ${missing.join(', ')}.`;
                if (extra.length > 0) msg += ` Colonnes en trop : ${extra.join(', ')}.`;
                setHeaderError(msg);
                return;
            }

            // Preview: show first 5 rows
            setPreviewData({
                headers,
                rows: rows.slice(0, 5),
                totalRows: rows.length,
                file,
            });
        };
        reader.readAsText(file, 'utf-8');
    };

    // ------- IMPORT STEP 2: confirm & send -------
    const handleConfirmImport = async () => {
        if (!previewData?.file) return;

        setImporting(true);
        setError('');

        try {
            const result = await productsService.importCsv(entityPath, previewData.file);
            setImportResult(result);
            setPreviewData(null);
            // Stay on the import tab to show the result
            setActiveTab('import');
            if (onImportSuccess) onImportSuccess();
        } catch (err) {
            const msg = err.response?.data?.error || 'Erreur lors de l\'import CSV.';
            setError(msg);
            setPreviewData(null);
            // Stay on the import tab to show the error
            setActiveTab('import');
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleClose = () => {
        resetImportState();
        setExporting(false);
        setActiveTab('export');
        onHide();
    };

    // ------- Truncate cell values for preview display -------
    const truncate = (val, max = 40) => {
        if (!val) return <span className="text-muted opacity-50">—</span>;
        const s = String(val);
        return s.length > max ? s.slice(0, max) + '…' : s;
    };

    return (
        <Modal show={show} onHide={handleClose} centered size={previewData ? 'lg' : undefined}>
            <Modal.Header closeButton className="border-0 pb-0">
                <Modal.Title className="fw-bold">
                    <i className="fas fa-file-csv me-2 text-accent"></i>
                    {entityName} — CSV
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="pt-3">
                {/* Hidden file input — always mounted so ref is stable */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="d-none"
                    id={`csv-import-${entityPath}`}
                />

                {importable ? (
                    <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} id={`csv-tabs-${entityPath}`} className="mb-3">
                        {/* ========== EXPORT TAB ========== */}
                        <Tab eventKey="export" title="Exporter">
                            <p className="text-muted small mb-3">
                                Téléchargez toutes vos données <strong>{entityName.toLowerCase()}</strong> au format CSV
                                (séparateur <code>;</code>), compatible avec Excel et Google Sheets.
                            </p>
                            <Button
                                variant="primary"
                                onClick={handleExport}
                                disabled={exporting}
                                className="w-100 d-flex align-items-center justify-content-center gap-2"
                            >
                                {exporting ? (
                                    <><Spinner size="sm" animation="border" /> Export en cours…</>
                                ) : (
                                    <><i className="fas fa-download"></i> Télécharger le CSV</>
                                )}
                            </Button>
                        </Tab>

                        {/* ========== IMPORT TAB ========== */}
                        <Tab eventKey="import" title="Importer">
                            {/* Error display inside import tab */}
                            {error && (
                                <Alert variant="danger" dismissible onClose={() => setError('')} className="mb-3">
                                    <i className="fas fa-circle-xmark me-2"></i>
                                    {error}
                                </Alert>
                            )}

                            {/* Format attendu — always visible */}
                            <div className="mb-3 p-3 bg-body-secondary rounded">
                                <div className="d-flex align-items-center gap-2 mb-2">
                                    <i className="fas fa-table-columns text-primary"></i>
                                    <strong className="small">Format attendu</strong>
                                </div>
                                <p className="text-muted small mb-2">
                                    Le fichier doit être un CSV avec le séparateur <code>;</code> et contenir
                                    <strong> exactement</strong> les colonnes suivantes :
                                </p>
                                <div className="d-flex flex-wrap gap-1">
                                    {expectedCols.map(col => (
                                        <Badge key={col} bg="light" className="text-dark border font-monospace" style={{ fontSize: '0.75rem' }}>
                                            {col}
                                        </Badge>
                                    ))}
                                </div>
                                <p className="text-muted small mt-2 mb-0">
                                    <i className="fas fa-lightbulb text-warning me-1"></i>
                                    <strong>Astuce :</strong> exportez d'abord un CSV pour obtenir le format exact,
                                    remplissez-le, puis importez-le ici.
                                </p>
                            </div>

                            {headerError && (
                                <Alert variant="danger" dismissible onClose={() => { setHeaderError(''); resetImportState(); }}>
                                    <i className="fas fa-circle-xmark me-2"></i>
                                    {headerError}
                                </Alert>
                            )}

                            {/* Import result message */}
                            {importResult && (
                                <div className="mb-3">
                                    <Alert variant={importResult.created > 0 ? 'success' : 'warning'} className="py-2 mb-2">
                                        <i className={`fas ${importResult.created > 0 ? 'fa-check-circle' : 'fa-exclamation-circle'} me-2`}></i>
                                        {importResult.message}
                                    </Alert>
                                    {importResult.errors && importResult.errors.length > 0 && (
                                        <Alert variant="warning" className="py-2 small">
                                            <strong className="d-block mb-1">
                                                <i className="fas fa-exclamation-triangle me-1"></i>
                                                {importResult.errors.length} avertissement(s) :
                                            </strong>
                                            <ul className="mb-0 ps-3">
                                                {importResult.errors.slice(0, 10).map((err, i) => (
                                                    <li key={i}>{err}</li>
                                                ))}
                                                {importResult.errors.length > 10 && (
                                                    <li className="text-muted">
                                                        … et {importResult.errors.length - 10} autre(s)
                                                    </li>
                                                )}
                                            </ul>
                                        </Alert>
                                    )}
                                </div>
                            )}

                            {/* STEP 1: File select (if no preview yet and no result) */}
                            {!previewData && !importResult && (
                                <Button
                                    variant="outline-primary"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-100 d-flex align-items-center justify-content-center gap-2"
                                >
                                    <i className="fas fa-upload"></i> Choisir un fichier CSV
                                </Button>
                            )}

                            {/* Allow re-import after result */}
                            {importResult && (
                                <Button
                                    variant="outline-primary"
                                    onClick={resetImportState}
                                    className="w-100 d-flex align-items-center justify-content-center gap-2 mt-2"
                                >
                                    <i className="fas fa-rotate"></i> Importer un autre fichier
                                </Button>
                            )}

                            {/* STEP 2: Preview table */}
                            {previewData && (
                                <div className="mt-3">
                                    <Alert variant="info" className="py-2 d-flex align-items-center gap-2">
                                        <i className="fas fa-eye"></i>
                                        <span>
                                            Aperçu — <strong>{previewData.totalRows} ligne(s)</strong> détectée(s).
                                            {previewData.totalRows > 5 && ' (5 premières affichées)'}
                                        </span>
                                    </Alert>

                                    <div className="table-responsive border rounded" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                                        <Table size="sm" hover className="mb-0 small">
                                            <thead className="bg-light sticky-top">
                                                <tr>
                                                    <th className="text-muted" style={{ width: '30px' }}>#</th>
                                                    {previewData.headers.map((h, i) => (
                                                        <th key={i} className="text-nowrap">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {previewData.rows.map((row, ri) => (
                                                    <tr key={ri}>
                                                        <td className="text-muted">{ri + 1}</td>
                                                        {row.map((cell, ci) => (
                                                            <td key={ci}>{truncate(cell)}</td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    </div>

                                    <div className="d-flex justify-content-end gap-2 mt-3">
                                        <Button variant="light" onClick={resetImportState}>
                                            Annuler
                                        </Button>
                                        <Button
                                            variant="primary"
                                            onClick={handleConfirmImport}
                                            disabled={importing}
                                            className="px-4 d-flex align-items-center gap-2"
                                        >
                                            {importing ? (
                                                <><Spinner size="sm" animation="border" /> Import en cours…</>
                                            ) : (
                                                <><i className="fas fa-check"></i> Confirmer l'import ({previewData.totalRows} lignes)</>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </Tab>
                    </Tabs>
                ) : (
                    /* ========== Export-only mode ========== */
                    <>
                        <p className="text-muted small mb-3">
                            Téléchargez toutes vos données <strong>{entityName.toLowerCase()}</strong> au format CSV
                            (séparateur <code>;</code>), compatible avec Excel et Google Sheets.
                        </p>
                        <Button
                            variant="primary"
                            onClick={handleExport}
                            disabled={exporting}
                            className="w-100 d-flex align-items-center justify-content-center gap-2"
                        >
                            {exporting ? (
                                <><Spinner size="sm" animation="border" /> Export en cours…</>
                            ) : (
                                <><i className="fas fa-download"></i> Télécharger le CSV</>
                            )}
                        </Button>
                    </>
                )}
            </Modal.Body>
            <Modal.Footer className="border-0 pt-0">
                <Button variant="light" onClick={handleClose}>Fermer</Button>
            </Modal.Footer>
        </Modal>
    );
};

export default CsvModal;
