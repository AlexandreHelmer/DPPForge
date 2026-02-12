import React, { useState, useEffect } from 'react';
import { Button, Modal, Form, Alert, Badge } from 'react-bootstrap';
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

    const columns = [
        {
            header: 'Nom du composant',
            key: 'name',
            className: 'px-4',
            render: (val, item) => (
                <>
                    <div className="fw-bold">{val}</div>
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
                    <Button size="sm" variant="link" className="text-accent text-decoration-none fw-bold" onClick={() => handleEdit(item)}>
                        Modifier
                    </Button>
                    <Button size="sm" variant="link" className="text-danger text-decoration-none" onClick={() => handleDelete(id)}>
                        <i className="fas fa-trash-can"></i>
                    </Button>
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

            <ListTable
                items={components}
                columns={columns}
                searchPlaceholder="Rechercher par nom, fabricant, origine..."
                emptyMessage="Aucun composant trouvé"
            />

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
        </div>
    );
};

export default ComponentList;
