import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Alert, Spinner, Modal } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { productsService } from '../services/products';
import ListTable from '../components/ListTable';
import CsvModal from '../components/CsvModal';
import PageToolbar from '../components/PageToolbar';

const DigitalTwins = () => {
    const [snapshots, setSnapshots] = useState([]);
    const [formData, setFormData] = useState({
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
        loadSnapshots();
        loadInstances();
    }, []);

    const loadSnapshots = async () => {
        try {
            const data = await productsService.getSnapshots();
            setSnapshots(Array.isArray(data) ? data : data.results || []);
        } catch (err) {
            console.error('Erreur lors du chargement des snapshots', err);
        }
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
                newLabel="Générer des Digital Twins"
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
                    <Modal.Title className="fw-bold">Générer de nouveaux Digital Twins</Modal.Title>
                </Modal.Header>
                <Modal.Body className="pt-4">
                    {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
                    {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

                    <Form onSubmit={handleSubmit}>
                        <div className="row g-3">
                            <div className="col-md-8">
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-medium small text-muted text-uppercase">Snapshot (version) *</Form.Label>
                                    <Form.Select
                                        value={formData.snapshot}
                                        onChange={(e) => setFormData({ ...formData, snapshot: e.target.value })}
                                        required
                                        className="form-select shadow-none"
                                    >
                                        <option value="">Choisir une version...</option>
                                        {snapshots.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.main_product_name} — {new Date(s.created_at).toLocaleString('fr-FR')}
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
                                        value={formData.snapshotion_batch}
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
                                {loading ? 'Génération...' : 'Générer les Digital Twins'}
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
