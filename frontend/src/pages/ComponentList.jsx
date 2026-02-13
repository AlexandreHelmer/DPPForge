import React, { useState, useEffect } from 'react';
import { Button, Modal, Form, Alert, Badge, InputGroup } from 'react-bootstrap';
import { productsService } from '../services/products';
import ListTable from '../components/ListTable';

const ComponentList = () => {
    const [components, setComponents] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        manufacturer: '',
        origin_country: '',
        gtin: '',
    });
    const [editingId, setEditingId] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [listLoading, setListLoading] = useState(true);

    // Supplier link modal
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [supplierComponentId, setSupplierComponentId] = useState(null);
    const [supplierComponentName, setSupplierComponentName] = useState('');
    const [supplierForm, setSupplierForm] = useState({
        password: '',
        expires_in_days: 7,
        supplier_email: '',
    });
    const [supplierLoading, setSupplierLoading] = useState(false);
    const [supplierSuccess, setSupplierSuccess] = useState('');
    const [supplierError, setSupplierError] = useState('');

    useEffect(() => {
        loadComponents();
    }, []);

    const loadComponents = async () => {
        setListLoading(true);
        try {
            const data = await productsService.getComponents();
            setComponents(Array.isArray(data) ? data : data.results || []);
        } catch (err) {
            setError('Erreur lors du chargement des composants');
        } finally {
            setListLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (editingId) {
                await productsService.updateComponent(editingId, formData);
            } else {
                await productsService.createComponent(formData);
            }
            setShowModal(false);
            resetForm();
            loadComponents();
        } catch (err) {
            const msg = err.response?.data?.[0] || err.response?.data?.detail || 'Erreur lors de l\'enregistrement.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (component) => {
        setFormData({
            name: component.name,
            description: component.description || '',
            manufacturer: component.manufacturer || '',
            origin_country: component.origin_country || '',
            gtin: component.gtin || '',
        });
        setEditingId(component.id);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Voulez-vous vraiment supprimer ce composant ?')) {
            try {
                await productsService.deleteComponent(id);
                loadComponents();
            } catch (err) {
                const msg = err.response?.data?.[0] || err.response?.data?.detail || 'Erreur lors de la suppression. Ce composant est probablement utilisé par des produits.';
                alert(msg);
            }
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            manufacturer: '',
            origin_country: '',
            gtin: '',
        });
        setEditingId(null);
        setError('');
    };

    // Supplier link handlers
    const openSupplierModal = (component) => {
        setSupplierComponentId(component.id);
        setSupplierComponentName(component.name);
        setSupplierForm({ password: '', expires_in_days: 7, supplier_email: '' });
        setSupplierError('');
        setSupplierSuccess('');
        setShowSupplierModal(true);
    };

    const handleCreateSupplierLink = async (e) => {
        e.preventDefault();
        setSupplierLoading(true);
        setSupplierError('');
        setSupplierSuccess('');

        try {
            const result = await productsService.createSupplierLink({
                component: supplierComponentId,
                ...supplierForm,
            });
            setSupplierSuccess(result.link_url);
            navigator.clipboard?.writeText(result.link_url);
            loadComponents();
        } catch (err) {
            const msg = err.response?.data?.error || err.response?.data?.[0] || 'Erreur lors de la création du lien.';
            setSupplierError(msg);
        } finally {
            setSupplierLoading(false);
        }
    };

    const columns = [
        {
            header: 'Nom du composant',
            key: 'name',
            className: 'px-4',
            render: (val, item) => (
                <>
                    <div className="d-flex align-items-center gap-2">
                        <span className="fw-bold">{val}</span>
                        {item.supplier_validated && (
                            <Badge bg="success" className="d-inline-flex align-items-center gap-1" style={{ fontSize: '0.7rem' }}>
                                <i className="fas fa-check-circle"></i> Validé fournisseur
                            </Badge>
                        )}
                        {item.supplier_locked && (
                            <Badge bg="secondary" style={{ fontSize: '0.65rem' }}>
                                <i className="fas fa-lock"></i>
                            </Badge>
                        )}
                    </div>
                    <div className="small text-muted text-truncate" style={{ maxWidth: '300px' }}>
                        {item.description || <span className="text-muted opacity-50 italic">Pas de description</span>}
                    </div>
                </>
            )
        },
        {
            header: 'Fabricant',
            key: 'manufacturer',
            render: (val) => val || <span className="text-muted opacity-50">-</span>
        },
        {
            header: 'Origine',
            key: 'origin_country',
            render: (val) => val ? <Badge bg="light" className="text-dark border">{val}</Badge> : '-'
        },
        {
            header: 'GTIN',
            key: 'gtin',
            render: (val) => val ? <code>{val}</code> : <span className="text-muted opacity-50">-</span>
        },
        {
            header: 'Actions',
            key: 'id',
            className: 'text-end px-4',
            render: (id, item) => (
                <div className="d-flex justify-content-end gap-1">
                    {!item.supplier_locked && (
                        <>
                            <Button
                                size="sm"
                                variant="link"
                                className="text-accent text-decoration-none fw-bold"
                                onClick={() => handleEdit(item)}
                            >
                                Modifier
                            </Button>
                            <Button
                                size="sm"
                                variant="link"
                                className="text-primary text-decoration-none"
                                onClick={() => openSupplierModal(item)}
                                title="Demander les infos au fournisseur"
                            >
                                <i className="fas fa-link me-1"></i>Fournisseur
                            </Button>
                            <Button size="sm" variant="link" className="text-danger text-decoration-none" onClick={() => handleDelete(id)}>
                                <i className="fas fa-trash-can"></i>
                            </Button>
                        </>
                    )}
                    {item.supplier_locked && (
                        <span className="text-muted small fst-italic">Verrouillé</span>
                    )}
                </div>
            )
        }
    ];

    if (listLoading) return <div className="text-center p-5">Chargement de la bibliothèque...</div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="mb-0">Bibliothèque des Composants</h1>
                    <p className="text-muted mb-0">Gérez les composants et matériaux utilisés dans vos produits.</p>
                </div>
                <div className="header-actions">
                    <Button onClick={() => { resetForm(); setShowModal(true); }} variant="accent" className="text-white shadow-sm">
                        <i className="fas fa-plus me-1"></i> Ajouter un composant
                    </Button>
                </div>
            </div>

            {supplierSuccess && !showSupplierModal && (
                <Alert variant="success" dismissible onClose={() => setSupplierSuccess('')} className="mb-4">
                    <i className="fas fa-check-circle me-2"></i>
                    Lien fournisseur créé et copié dans le presse-papier !
                </Alert>
            )}

            <ListTable
                items={components}
                columns={columns}
                searchPlaceholder="Rechercher par nom, fabricant, origine..."
                emptyMessage="Aucun composant trouvé"
            />

            {/* Component edit/create modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-bold">{editingId ? 'Modifier' : 'Nouveau'} Composant</Modal.Title>
                </Modal.Header>
                <Modal.Body className="pt-4">
                    {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
                    <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-4">
                            <Form.Label className="fw-medium">Désignation *</Form.Label>
                            <Form.Control
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                placeholder="Ex: Module de commande électronique v4"
                            />
                        </Form.Group>

                        <Form.Group className="mb-4">
                            <Form.Label className="fw-medium">Description technique</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </Form.Group>

                        <div className="row">
                            <div className="col-md-6">
                                <Form.Group className="mb-4">
                                    <Form.Label className="fw-medium">Fabricant / Fournisseur</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={formData.manufacturer}
                                        onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                                        placeholder="Nom de l'entité"
                                    />
                                </Form.Group>
                            </div>
                            <div className="col-md-6">
                                <Form.Group className="mb-4">
                                    <Form.Label className="fw-medium">Pays d'origine</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={formData.origin_country}
                                        onChange={(e) => setFormData({ ...formData, origin_country: e.target.value })}
                                        placeholder="Ex: France"
                                    />
                                </Form.Group>
                            </div>
                        </div>

                        <Form.Group className="mb-4">
                            <Form.Label className="fw-medium">GTIN (Global Trade Item Number)</Form.Label>
                            <Form.Control
                                type="text"
                                value={formData.gtin}
                                onChange={(e) => setFormData({ ...formData, gtin: e.target.value })}
                                maxLength={14}
                                placeholder="Code barres à 14 chiffres"
                            />
                        </Form.Group>

                        <div className="d-flex justify-content-end mt-4 pt-3 border-top gap-2">
                            <Button variant="light" onClick={() => setShowModal(false)}>
                                Annuler
                            </Button>
                            <Button type="submit" variant="primary" disabled={loading} className="px-5 shadow-sm">
                                {loading ? 'Enregistrement...' : 'Sauvegarder'}
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>

            {/* Supplier link creation modal */}
            <Modal show={showSupplierModal} onHide={() => setShowSupplierModal(false)} centered>
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-bold">
                        <i className="fas fa-magic me-2 text-accent"></i>
                        Lien fournisseur
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="pt-3">
                    <p className="text-muted">
                        Créez un lien pour permettre au fournisseur de remplir les informations du composant <strong>« {supplierComponentName} »</strong>.
                    </p>

                    {supplierError && <Alert variant="danger" dismissible onClose={() => setSupplierError('')}>{supplierError}</Alert>}

                    {supplierSuccess ? (
                        <div>
                            <Alert variant="success">
                                <i className="fas fa-check-circle me-2"></i>
                                Lien créé et copié dans le presse-papier !
                            </Alert>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-medium small">Lien à envoyer :</Form.Label>
                                <InputGroup>
                                    <Form.Control
                                        value={supplierSuccess}
                                        readOnly
                                        size="sm"
                                    />
                                    <Button
                                        variant="outline-primary"
                                        size="sm"
                                        onClick={() => navigator.clipboard?.writeText(supplierSuccess)}
                                    >
                                        <i className="fas fa-copy"></i>
                                    </Button>
                                </InputGroup>
                            </Form.Group>
                            <div className="d-flex justify-content-end">
                                <Button variant="primary" onClick={() => setShowSupplierModal(false)}>
                                    Fermer
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <Form onSubmit={handleCreateSupplierLink}>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-medium">
                                    <i className="fas fa-lock me-1 text-warning"></i>
                                    Mot de passe (optionnel)
                                </Form.Label>
                                <Form.Control
                                    type="text"
                                    value={supplierForm.password}
                                    onChange={(e) => setSupplierForm({ ...supplierForm, password: e.target.value })}
                                    placeholder="Laissez vide pour un accès libre"
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label className="fw-medium">Validité</Form.Label>
                                <InputGroup>
                                    <Form.Control
                                        type="number"
                                        min={1}
                                        max={90}
                                        value={supplierForm.expires_in_days}
                                        onChange={(e) => setSupplierForm({ ...supplierForm, expires_in_days: parseInt(e.target.value) || 7 })}
                                    />
                                    <InputGroup.Text>jours</InputGroup.Text>
                                </InputGroup>
                            </Form.Group>

                            <Form.Group className="mb-4">
                                <Form.Label className="fw-medium">Email fournisseur (optionnel)</Form.Label>
                                <Form.Control
                                    type="email"
                                    value={supplierForm.supplier_email}
                                    onChange={(e) => setSupplierForm({ ...supplierForm, supplier_email: e.target.value })}
                                    placeholder="Pour votre suivi"
                                />
                            </Form.Group>

                            <div className="d-flex justify-content-end gap-2">
                                <Button variant="light" onClick={() => setShowSupplierModal(false)}>
                                    Annuler
                                </Button>
                                <Button type="submit" variant="primary" disabled={supplierLoading} className="px-4">
                                    {supplierLoading ? 'Création...' : 'Créer le lien'}
                                </Button>
                            </div>
                        </Form>
                    )}
                </Modal.Body>
            </Modal>
        </div>
    );
};

export default ComponentList;
