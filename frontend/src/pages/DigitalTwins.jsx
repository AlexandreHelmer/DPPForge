import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Alert } from 'react-bootstrap';
import { productsService } from '../services/products';
import ListTable from '../components/ListTable';

const DigitalTwins = () => {
    const [products, setProducts] = useState([]);
    const [formData, setFormData] = useState({
        product: '',
        quantity: 10,
        production_batch: '',
        serial_number_prefix: 'SN',
    });
    const [instances, setInstances] = useState([]);
    const [loading, setLoading] = useState(false);
    const [listLoading, setListLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        loadProducts();
        loadInstances();
    }, []);

    const loadProducts = async () => {
        try {
            const data = await productsService.getProducts();
            const locked = (Array.isArray(data) ? data : data.results || []).filter(
                (p) => p.status === 'LOCKED'
            );
            setProducts(locked);
        } catch (err) {
            console.error('Erreur lors du chargement des produits', err);
        }
    };

    const loadInstances = async () => {
        setListLoading(true);
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
        } catch (err) {
            setError(err.response?.data?.error || 'Erreur lors de la génération des Digital Twins');
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            header: 'Produit',
            key: 'product_name',
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
            header: 'QR Code',
            key: 'qr_code',
            render: (val, item) => (
                val ? (
                    <a
                        href={val}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-outline-primary py-0 px-2"
                        aria-label={`Télécharger le QR code pour ${item.serial_number}`}
                    >
                        <i className="fas fa-download me-1"></i> QR
                    </a>
                ) : '-'
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

    return (
        <div className="animate-fade-in">
            <h1 className="mb-4">Digital Twins Manager</h1>

            <Card className="mb-5 border-0 shadow-sm">
                <Card.Header className="bg-white py-3 fw-bold border-bottom-0">Générer de nouveaux Digital Twins</Card.Header>
                <Card.Body className="pt-0">
                    {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
                    {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

                    <Form onSubmit={handleSubmit}>
                        <div className="row">
                            <div className="col-md-6">
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-medium small text-muted text-uppercase">Produit (Modèles verrouillés) *</Form.Label>
                                    <Form.Select
                                        value={formData.product}
                                        onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                                        required
                                        className="form-select-lg shadow-none"
                                    >
                                        <option value="">Choisir un modèle de produit...</option>
                                        {products.map((product) => (
                                            <option key={product.id} value={product.id}>
                                                {product.name} ({product.gtin})
                                            </option>
                                        ))}
                                    </Form.Select>
                                    <Form.Text className="text-muted">
                                        Seuls les modèles avec un Passeport Numérique validé sont listés.
                                    </Form.Text>
                                </Form.Group>
                            </div>
                            <div className="col-md-2">
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-medium small text-muted text-uppercase">Quantité *</Form.Label>
                                    <Form.Control
                                        type="number"
                                        min="1"
                                        max="1000"
                                        value={formData.quantity}
                                        onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                                        required
                                        className="form-control-lg shadow-none"
                                    />
                                </Form.Group>
                            </div>
                            <div className="col-md-4">
                                <label className="fw-medium small text-muted text-uppercase mb-2">Actions</label>
                                <Button type="submit" variant="accent" size="lg" className="w-100 text-white shadow-sm" disabled={loading || !formData.product}>
                                    {loading ? 'Génération...' : 'Générer les Digital Twins'}
                                </Button>
                            </div>
                        </div>

                        <hr className="my-4 opacity-10" />

                        <div className="row">
                            <div className="col-md-6">
                                <Form.Group className="mb-0">
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
                                <Form.Group className="mb-0">
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
                    </Form>
                </Card.Body>
            </Card>

            <div className="d-flex justify-content-between align-items-center mb-4 mt-2">
                <h2 className="h4 mb-0">Registre des Digital Twins</h2>
            </div>

            {listLoading ? (
                <div className="text-center p-5">Chargement du registre...</div>
            ) : (
                <ListTable
                    items={instances}
                    columns={columns}
                    searchPlaceholder="Rechercher par numéro de série, produit, lot..."
                    emptyMessage="Aucun Digital Twin généré."
                />
            )}
        </div>
    );
};

export default DigitalTwins;
