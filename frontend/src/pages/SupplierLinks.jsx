import React, { useState, useEffect } from 'react';
import { Button, Badge, Modal, Form, Alert, InputGroup } from 'react-bootstrap';
import { productsService } from '../services/products';
import ListTable from '../components/ListTable';

const SupplierLinks = () => {
    const [links, setLinks] = useState([]);
    const [components, setComponents] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [listLoading, setListLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [copiedId, setCopiedId] = useState(null);

    const [formData, setFormData] = useState({
        component: '',
        password: '',
        expires_in_days: 7,
        supplier_email: '',
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setListLoading(true);
        try {
            const [linksData, compsData] = await Promise.all([
                productsService.getSupplierLinks(),
                productsService.getComponents()
            ]);
            setLinks(Array.isArray(linksData) ? linksData : linksData.results || []);
            setComponents(Array.isArray(compsData) ? compsData : compsData.results || []);
        } catch (err) {
            setError('Erreur lors du chargement des données.');
        } finally {
            setListLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const result = await productsService.createSupplierLink(formData);
            setShowModal(false);
            setSuccess(`Lien créé avec succès ! URL : ${result.link_url}`);
            resetForm();
            loadData();

            // Auto-copy to clipboard
            if (result.link_url) {
                navigator.clipboard?.writeText(result.link_url);
            }
        } catch (err) {
            const msg = err.response?.data?.error || err.response?.data?.[0] || 'Erreur lors de la création du lien.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleRevoke = async (id) => {
        if (window.confirm('Voulez-vous vraiment révoquer ce lien ? Le fournisseur ne pourra plus y accéder.')) {
            try {
                await productsService.revokeSupplierLink(id);
                loadData();
            } catch (err) {
                alert('Erreur lors de la révocation.');
            }
        }
    };

    const handleCopy = (url, id) => {
        navigator.clipboard?.writeText(url);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const resetForm = () => {
        setFormData({
            component: '',
            password: '',
            expires_in_days: 7,
            supplier_email: '',
        });
        setError('');
    };

    const getStatusBadge = (statusVal, item) => {
        const statusConfig = {
            active: { bg: 'success', label: 'Actif' },
            expired: { bg: 'secondary', label: 'Expiré' },
            revoked: { bg: 'danger', label: 'Révoqué' },
            submitted: { bg: 'primary', label: 'Soumis ✓' },
            inactive: { bg: 'dark', label: 'Inactif' },
        };
        const cfg = statusConfig[statusVal] || { bg: 'secondary', label: statusVal };
        return (
            <div>
                <Badge bg={cfg.bg}>{cfg.label}</Badge>
                {statusVal === 'active' && item.expires_at && (
                    <div className="small text-muted mt-1" style={{ fontSize: '0.7rem' }}>
                        Exp: {new Date(item.expires_at).toLocaleDateString('fr-FR')}
                    </div>
                )}
            </div>
        );
    };

    // Only show components not yet locked (neither by supplier nor by brand)
    const availableComponents = components.filter(c => !c.supplier_locked && !c.is_brand_locked);

    const columns = [
        {
            header: 'Composant',
            key: 'component_name',
            className: 'px-4',
            render: (val) => <span className="fw-bold">{val}</span>
        },
        {
            header: 'Statut',
            key: 'status',
            render: (val, item) => getStatusBadge(val, item)
        },
        {
            header: 'Protection',
            key: 'is_password_protected',
            render: (val) => val
                ? <Badge bg="warning" className="text-dark"><i className="fas fa-lock me-1"></i>Mot de passe</Badge>
                : <Badge bg="light" className="text-muted border">Ouvert</Badge>
        },
        {
            header: 'Créé le',
            key: 'created_at',
            render: (val) => (
                <div className="small">
                    <div>{new Date(val).toLocaleDateString('fr-FR')}</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                        {new Date(val).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
            )
        },
        {
            header: 'Dernière activité',
            key: 'updated_at',
            render: (val) => (
                <div className="small">
                    <div className="fw-bold">{new Date(val).toLocaleDateString('fr-FR')}</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                        {new Date(val).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
            )
        },
        {
            header: 'Actions',
            key: 'id',
            className: 'text-end px-4',
            render: (id, item) => (
                <div className="d-flex justify-content-end gap-1">
                    <Button
                        size="sm"
                        variant="outline-primary"
                        onClick={() => handleCopy(item.link_url, id)}
                        title="Copier le lien"
                    >
                        <i className={`fas ${copiedId === id ? 'fa-check' : 'fa-copy'}`}></i>
                    </Button>
                    {item.status === 'active' && (
                        <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => handleRevoke(id)}
                            title="Révoquer"
                        >
                            <i className="fas fa-ban"></i>
                        </Button>
                    )}
                </div>
            )
        }
    ];

    if (listLoading) return <div className="text-center p-5">Chargement des liens fournisseurs...</div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="mb-0">Liens Fournisseurs</h1>
                    <p className="text-muted mb-0">Gérez les liens fournisseurs pour solliciter vos fournisseurs et compléter les informations composants.</p>
                </div>
                <div className="header-actions">
                    <Button
                        onClick={() => { resetForm(); setShowModal(true); }}
                        variant="accent"
                        className="text-white shadow-sm"
                        disabled={availableComponents.length === 0}
                    >
                        <i className="fas fa-link me-1"></i> Créer un lien fournisseur
                    </Button>
                </div>
            </div>

            {success && (
                <Alert variant="success" dismissible onClose={() => setSuccess('')} className="mb-4">
                    <i className="fas fa-check-circle me-2"></i>{success}
                </Alert>
            )}

            <ListTable
                items={links}
                columns={columns}
                searchPlaceholder="Rechercher par composant..."
                emptyMessage="Aucun lien fournisseur créé"
            />

            {/* Create Link Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-bold">
                        <i className="fas fa-link me-2 text-accent"></i>
                        Nouveau lien fournisseur
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="pt-4">
                    {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
                    <Form onSubmit={handleCreate}>
                        <Form.Group className="mb-4">
                            <Form.Label className="fw-medium">Composant *</Form.Label>
                            <Form.Select
                                value={formData.component}
                                onChange={(e) => setFormData({ ...formData, component: e.target.value })}
                                required
                            >
                                <option value="">Sélectionnez un composant...</option>
                                {availableComponents.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </Form.Select>
                            <Form.Text className="text-muted">
                                Le fournisseur pourra remplir les informations de ce composant.
                            </Form.Text>
                        </Form.Group>

                        <Form.Group className="mb-4">
                            <Form.Label className="fw-medium">
                                <i className="fas fa-lock me-1 text-warning"></i>
                                Mot de passe de protection (optionnel)
                            </Form.Label>
                            <Form.Control
                                type="text"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder="Laissez vide pour un accès libre"
                            />
                        </Form.Group>

                        <Form.Group className="mb-4">
                            <Form.Label className="fw-medium">Durée de validité</Form.Label>
                            <InputGroup>
                                <Form.Control
                                    type="number"
                                    min={1}
                                    max={90}
                                    value={formData.expires_in_days}
                                    onChange={(e) => setFormData({ ...formData, expires_in_days: parseInt(e.target.value) || 7 })}
                                />
                                <InputGroup.Text>jours</InputGroup.Text>
                            </InputGroup>
                        </Form.Group>

                        <Form.Group className="mb-4">
                            <Form.Label className="fw-medium">Email du fournisseur (optionnel)</Form.Label>
                            <Form.Control
                                type="email"
                                value={formData.supplier_email}
                                onChange={(e) => setFormData({ ...formData, supplier_email: e.target.value })}
                                placeholder="fournisseur@example.com"
                            />
                            <Form.Text className="text-muted">
                                Pour votre suivi — aucun email ne sera envoyé au fournisseur automatiquement.
                            </Form.Text>
                        </Form.Group>

                        <div className="d-flex justify-content-end mt-4 pt-3 border-top gap-2">
                            <Button variant="light" onClick={() => setShowModal(false)}>
                                Annuler
                            </Button>
                            <Button type="submit" variant="primary" disabled={loading} className="px-5 shadow-sm">
                                {loading ? 'Création...' : 'Créer le lien'}
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>
        </div>
    );
};

export default SupplierLinks;
