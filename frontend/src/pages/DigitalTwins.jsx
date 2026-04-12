import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Alert, Spinner, Modal } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { productsService } from '../services/products';
import ListTable from '../components/ListTable';
import CsvModal from '../components/CsvModal';
import PageToolbar from '../components/PageToolbar';

const DigitalTwins = () => {
    const [products, setProducts] = useState([]);
    const [snapshots, setSnapshots] = useState([]);
    const [formData, setFormData] = useState({
        product: '',
        snapshot: '',
        quantity: 10,
        production_batch: '',
        serial_number_prefix: 'SN',
    });
    const [instances, setInstances] = useState([]);
    const [loading, setLoading] = useState(false);
    const [listLoading, setListLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showCsvModal, setShowCsvModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        loadProductsAndSnapshots();
        loadInstances();
    }, []);

    const loadProductsAndSnapshots = async () => {
        try {
            const [p, s] = await Promise.all([
                productsService.getProducts(),
                productsService.getSnapshots(),
            ]);
            const ps = Array.isArray(p) ? p : p.results || [];
            const ss = Array.isArray(s) ? s : s.results || [];
            setProducts(ps);
            setSnapshots(ss);

            // Default product and snapshot (latest)
            if (ps.length > 0) {
                const defaultProductId = ps[0].id;
                const productSnapshots = ss
                    .filter((x) => x.main_product === defaultProductId)
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                const defaultSnapshotId = productSnapshots[0]?.id || '';
                setFormData((prev) => ({
                    ...prev,
                    product: defaultProductId,
                    snapshot: defaultSnapshotId,
                }));
            }
        } catch (err) {
            console.error('Erreur lors du chargement des produits/snapshots', err);
        }
    };

    const snapshotsForSelectedProduct = (snapshots || [])
        .filter((s) => !formData.product || s.main_product === formData.product)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const handleChangeProduct = (productId) => {
        const productSnapshots = (snapshots || [])
            .filter((x) => x.main_product === productId)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const defaultSnapshotId = productSnapshots[0]?.id || '';
        setFormData((prev) => ({
            ...prev,
            product: productId,
            snapshot: defaultSnapshotId,
        }));
    };

    const loadInstances = async () => {
        if (instances.length === 0) setListLoading(true);
        try {
            const data = await productsService.getDigitalTwins();
            setInstances(Array.isArray(data) ? data : data.results || []);
        } catch (err) {
            console.error('Erreur lors du chargement des Digital Twins', err);
        } finally {
            setListLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const result = await productsService.batchCreateDigitalTwins(formData);
            setSuccess(result.message || 'Digital Twins générés avec succès');
            setFormData({ ...formData, quantity: 10, production_batch: '' });
            loadInstances();
            // Don't close modal immediately so user sees success message
        } catch (err) {
            setError(err.response?.data?.error || 'Erreur lors de la génération des Digital Twins');
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            header: 'Produit',
            key: 'main_product_name',
            className: 'px-4',
            render: (val, item) => (
                <div className="fw-bold">{val}</div>
            )
        },
        {
            header: 'Numéro de série',
            key: 'serial_number',
            render: (val) => <code>{val}</code>
        },
        {
            header: 'Lot',
            key: 'production_batch',
            render: (val) => val || <span className="text-muted opacity-50">-</span>
        },
        {
            header: 'Actions',
            key: 'id',
            className: 'text-end px-4',
            render: (id, item) => (
                <div className="d-flex justify-content-end gap-2">
                    {item.qr_code && (
                        <a
                            href={item.qr_code}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-outline-info py-0 px-2 d-inline-flex align-items-center"
                            aria-label={`Télécharger le QR code pour ${item.serial_number}`}
                            title="Télécharger le QR Code"
                        >
                            <i className="fas fa-download me-1"></i> QR
                        </a>
                    )}
                    <Button
                        as={Link}
                        to={`/twin/${id}`}
                        target="_blank"
                        variant="outline-info"
                        className="btn btn-sm text-decoration-none p-0 d-inline-flex align-items-center"
                        title="Voir la page consommateur"
                    >
                        <i className="fa-solid fa-eye me-1"></i> Visualiser
                    </Button>
                </div>
            )
        },
        {
            header: 'Date & Heure de création',
            key: 'created_at',
            className: 'px-4',
            render: (val) => {
                const date = new Date(val);
                return (
                    <div className="small">
                        <div className="fw-bold">{date.toLocaleDateString('fr-FR')}</div>
                        <div className="text-muted">{date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                );
            }
        }
    ];

    const filteredInstances = instances.filter(item => {
        const search = searchTerm.toLowerCase();
        return (item.main_product_name || '').toLowerCase().includes(search) ||
               (item.serial_number || '').toLowerCase().includes(search) ||
               (item.production_batch && item.production_batch.toLowerCase().includes(search));
    });

    return (
        <div className="animate-fade-in pb-5">
            <div className="page-header mb-4">
                <h1 className="mb-0">Digital Twins Manager</h1>
            </div>

            <PageToolbar
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder="Rechercher par numéro de série, produit, lot..."
                onCsvClick={() => setShowCsvModal(true)}
                onNewClick={() => { setError(''); setSuccess(''); setShowCreateModal(true); }}
                newLabel="Créer des Digital Twins"
                mobileLabel="Créer"
            />

            {listLoading ? (
                <div className="text-center p-5 bg-white rounded-4 shadow-sm">
                    <Spinner animation="border" variant="primary" className="mb-2" />
                    <p className="text-muted mb-0">Chargement du registre...</p>
                </div>
            ) : (
                <ListTable
                    items={filteredInstances}
                    columns={columns}
                    emptyMessage="Aucun Digital Twin généré."
                    compact
                    hideSearch={true}
                />
            )}

            {/* Creation Modal */}
            <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg" centered>
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-bold">Créer des Digital Twins</Modal.Title>
                </Modal.Header>
                <Modal.Body className="pt-4">
                    {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
                    {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

                    <Form onSubmit={handleSubmit}>
                        <div className="row g-3">
                            <div className="col-md-6">
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-medium small text-muted text-uppercase">Produit *</Form.Label>
                                    <Form.Select
                                        value={formData.product}
                                        onChange={(e) => handleChangeProduct(e.target.value)}
                                        required
                                        className="form-select shadow-none"
                                    >
                                        <option value="">Choisir un produit...</option>
                                        {products.map((p) => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </div>

                            <div className="col-md-6">
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-medium small text-muted text-uppercase">Version (Snapshot) *</Form.Label>
                                    <Form.Select
                                        value={formData.snapshot}
                                        onChange={(e) => setFormData({ ...formData, snapshot: e.target.value })}
                                        required
                                        className="form-select shadow-none"
                                    >
                                        <option value="">Choisir une version...</option>
                                        {snapshotsForSelectedProduct.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.name ? `${s.name} — ` : ''}{new Date(s.created_at).toLocaleString('fr-FR')}
                                            </option>
                                        ))}
                                    </Form.Select>
                                    <Form.Text className="text-muted">
                                        Les Digital Twins sont générés à partir d’une version (Snapshot) d’un produit.
                                    </Form.Text>
                                </Form.Group>
                            </div>

                            <div className="col-md-4">
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-medium small text-muted text-uppercase">Quantité *</Form.Label>
                                    <Form.Control
                                        type="number"
                                        min="1"
                                        max="1000"
                                        value={formData.quantity}
                                        onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                                        required
                                        className="shadow-none"
                                    />
                                </Form.Group>
                            </div>
                        </div>

                        <div className="row g-3 mt-1">
                            <div className="col-md-6">
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-medium small text-muted text-uppercase">Lot de production</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={formData.production_batch}
                                        onChange={(e) => setFormData({ ...formData, production_batch: e.target.value })}
                                        placeholder="Ex: BATCH-2024-001"
                                        className="shadow-none"
                                    />
                                </Form.Group>
                            </div>
                            <div className="col-md-6">
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-medium small text-muted text-uppercase">Préfixe série (Optionnel)</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={formData.serial_number_prefix}
                                        onChange={(e) => setFormData({ ...formData, serial_number_prefix: e.target.value })}
                                        className="shadow-none"
                                    />
                                </Form.Group>
                            </div>
                        </div>

                        <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                            <Button variant="light" onClick={() => setShowCreateModal(false)}>Fermer</Button>
                            <Button type="submit" variant="accent" className="text-white px-4" disabled={loading || !formData.snapshot}>
                                {loading ? 'Création...' : 'Créer les Digital Twins'}
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>

            {/* CSV Export-only modal */}
            <CsvModal
                show={showCsvModal}
                onHide={() => setShowCsvModal(false)}
                entityName="Digital Twins"
                entityPath="digital-twins"
                importable={false}
            />
        </div>
    );
};

export default DigitalTwins;
