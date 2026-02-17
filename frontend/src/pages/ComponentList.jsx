import React, { useState, useEffect } from 'react';
import { Button, Modal, Form, Alert, Badge, InputGroup } from 'react-bootstrap';
import { productsService } from '../services/products';
import ListTable from '../components/ListTable';
import ComponentForm from '../components/ComponentForm';

const ComponentList = () => {
    const [components, setComponents] = useState([]);
    const [showArchived, setShowArchived] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        manufacturer: '',
        material_composition: {},
        certifications: [],
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

    const handleEdit = (comp) => {
        setEditingId(comp.id);
        setFormData({
            name: comp.name || '',
            description: comp.description || '',
            manufacturer: comp.manufacturer || '',
            material_composition: comp.material_composition || {},
            certifications: comp.certifications || [],
            origin_country: comp.origin_country || '',
            gtin: comp.gtin || '',
        });
        setError('');
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

    const handleArchive = async (id, unarchive = false) => {
        const actionName = unarchive ? 'désarchiver' : 'archiver';
        if (window.confirm(`Voulez-vous vraiment ${actionName} ce composant ?`)) {
            try {
                if (unarchive) {
                    await productsService.unarchiveComponent(id);
                } else {
                    await productsService.archiveComponent(id);
                }
                loadComponents();
            } catch (err) {
                alert("Erreur lors de l'archivage");
            }
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({
            name: '',
            description: '',
            manufacturer: '',
            material_composition: {},
            certifications: [],
            origin_country: '',
            gtin: '',
        });
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
                        <button
                            type="button"
                            className="btn btn-link p-0 text-decoration-none fw-bold text-start"
                            onClick={() => handleEdit(item)}
                        >
                            {val}
                        </button>
                        {item.supplier_validated && (
                            <Badge bg="success" className="d-inline-flex align-items-center gap-1" style={{ fontSize: '0.7rem' }}>
                                <i className="fas fa-check-circle"></i> Validé fournisseur
                            </Badge>
                        )}
                        {item.is_brand_locked && (
                            <Badge bg="info" className="d-inline-flex align-items-center gap-1" style={{ fontSize: '0.7rem' }}>
                                <i className="fas fa-shield-halved"></i> Validé par la marque
                            </Badge>
                        )}
                        {(item.supplier_locked || item.is_brand_locked) && (
                            <Badge bg="secondary" style={{ fontSize: '0.65rem' }}>
                                <i className="fas fa-lock"></i>
                            </Badge>
                        )}
                        {item.is_archived && (
                            <Badge bg="warning" text="dark" style={{ fontSize: '0.65rem' }}>
                                Archivé
                            </Badge>
                        )}
                    </div>
                    <div className="small text-muted text-truncate" style={{ maxWidth: '260px' }}>
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
            header: 'Utilisé dans',
            key: 'used_in_products',
            render: (val) => (
                val && val.length > 0 ? (
                    <div className="d-flex flex-wrap gap-1">
                        {val.map((product) => (
                            <Badge
                                key={product.id}
                                bg={product.is_archived ? 'secondary' : 'light'}
                                className={product.is_archived ? '' : 'text-dark border'}
                                style={{ fontSize: '0.65rem' }}
                            >
                                {product.name}
                            </Badge>
                        ))}
                    </div>
                ) : <span className="text-muted opacity-75">Aucun produit</span>
            )
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
            header: 'Dernière modif.',
            key: 'updated_at',
            render: (val) => (
                val
                    ? (
                        <div className="small text-nowrap">
                            {new Date(val).toLocaleDateString('fr-FR')}<br />
                            <span className="text-muted">{new Date(val).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    )
                    : <span className="text-muted">-</span>
            )
        },
        {
            header: 'Actions',
            key: 'id',
            className: 'text-end px-4',
            render: (id, item) => {
                const isLocked = item.supplier_locked || item.is_brand_locked;
                return (
                    <div className="d-flex justify-content-end gap-1">
                        <Button
                            size="sm"
                            variant="link"
                            className="text-secondary text-decoration-none"
                            onClick={() => handleArchive(id, item.is_archived)}
                            title={item.is_archived ? "Désarchiver" : "Archiver"}
                        >
                            <i className={`fas ${item.is_archived ? 'fa-box-open' : 'fa-box-archive'}`}></i>
                        </Button>

                        {!isLocked && (
                            <>
                                <Button
                                    size="sm"
                                    variant="link"
                                    className="text-warning text-decoration-none"
                                    onClick={() => openSupplierModal(item)}
                                    title="Demander les infos au fournisseur"
                                >
                                    <i className="fas fa-link"></i>
                                </Button>
                                <Button size="sm" variant="link" className="text-danger text-decoration-none" onClick={() => handleDelete(id)} title="Supprimer">
                                    <i className="fas fa-trash-can"></i>
                                </Button>
                            </>
                        )}

                        {isLocked && (
                            <span className="text-muted d-flex align-items-center ms-2" title="Ce composant est verrouillé">
                                <i className="fas fa-lock small"></i>
                            </span>
                        )}
                    </div>
                );
            }
        }
    ];

    if (listLoading) return <div className="text-center p-5">Chargement de la bibliothèque...</div>;
    const filteredComponents = components.filter(c => showArchived ? c.is_archived : !c.is_archived);

    const editingComponent = components.find(c => c.id === editingId);
    const isReadOnlyModal = !!editingComponent && (editingComponent.supplier_locked || editingComponent.is_brand_locked);

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="mb-0">Matériaux & Composants</h1>
                    <p className="text-muted mb-0">Gérez les matières premières, pièces et composants de vos fournisseurs.</p>
                </div>
            </div>

            {supplierSuccess && !showSupplierModal && (
                <Alert variant="success" dismissible onClose={() => setSupplierSuccess('')} className="mb-4">
                    <i className="fas fa-check-circle me-2"></i>
                    Lien fournisseur créé et copié dans le presse-papier !
                </Alert>
            )}

            <ListTable
                items={filteredComponents}
                columns={columns}
                searchPlaceholder="Rechercher par nom, fabricant, origine..."
                emptyMessage={showArchived ? "Aucun composant archivé" : "Aucun composant actif"}
                compact
                toolbarActions={
                    <>
                        <Form.Check
                            type="switch"
                            id="show-archived-components"
                            label="Voir les archives"
                            checked={showArchived}
                            onChange={(e) => setShowArchived(e.target.checked)}
                            className="mb-0"
                        />
                        <Button onClick={() => { resetForm(); setShowModal(true); }} variant="accent" className="text-white shadow-sm">
                            <i className="fas fa-plus me-1"></i> Nouveau composant
                        </Button>
                    </>
                }
            />

            {/* Component edit/create modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-bold">
                        {editingId ? (
                            (components.find(c => c.id === editingId)?.supplier_locked ||
                                components.find(c => c.id === editingId)?.is_brand_locked)
                                ? 'Consulter l\'élément' : 'Modifier l\'élément'
                        ) : 'Nouveau Matériau / Pièce'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="pt-4">
                    {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
                    {isReadOnlyModal && (
                        <Alert variant="info" className="d-flex align-items-center gap-2 mb-4">
                            <i className="fas fa-info-circle"></i>
                            <span>Ce composant est en lecture seule car il a été validé.</span>
                        </Alert>
                    )}
                    <ComponentForm
                        formData={formData}
                        setFormData={setFormData}
                        onSubmit={handleSubmit}
                        onCancel={() => setShowModal(false)}
                        loading={loading}
                        readOnly={isReadOnlyModal}
                        submitLabel="Sauvegarder"
                        cancelLabel={isReadOnlyModal ? 'Fermer' : 'Annuler'}
                        showSubmit={!isReadOnlyModal}
                    />
                </Modal.Body>
            </Modal>

            {/* Supplier link creation modal */}
            <Modal show={showSupplierModal} onHide={() => setShowSupplierModal(false)} centered>
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-bold">
                        <i className="fas fa-link me-2 text-accent"></i>
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
