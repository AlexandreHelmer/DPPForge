import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Row, Col, Alert, Badge, ListGroup, InputGroup, Modal } from 'react-bootstrap';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { productsService } from '../services/products';

const ProductForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = !!id;

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        gtin: '',
        category: '',
        brand: '',
        model_number: '',
        components: [], // Array of IDs
    });

    const [selectedComponents, setSelectedComponents] = useState([]);
    const [availableComponents, setAvailableComponents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [status, setStatus] = useState('DRAFT');
    const [isArchived, setIsArchived] = useState(false);
    const [showLockModal, setShowLockModal] = useState(false);

    useEffect(() => {
        loadComponents();
        if (isEdit) {
            loadProduct();
        }
    }, [id]);

    const loadComponents = async () => {
        try {
            const data = await productsService.getComponents();
            const cms = Array.isArray(data) ? data : data.results || [];
            setAvailableComponents(cms);
        } catch (err) {
            console.error('Erreur chargement composants', err);
        }
    };

    const loadProduct = async () => {
        try {
            const data = await productsService.getProduct(id);
            setFormData({
                name: data.name,
                description: data.description || '',
                gtin: data.gtin || '',
                category: data.category || '',
                brand: data.brand || '',
                model_number: data.model_number || '',
                components: data.components || [],
            });
            setSelectedComponents(data.components_detail || []);
            setStatus(data.status);
            setIsArchived(data.is_archived);
        } catch (err) {
            setError('Erreur lors du chargement du produit');
        }
    };

    const handleSubmit = async (e, shouldLock = false) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            let savedProduct;
            if (isEdit) {
                savedProduct = await productsService.updateProduct(id, formData);
            } else {
                savedProduct = await productsService.createProduct(formData);
            }

            if (shouldLock) {
                try {
                    await productsService.lockProduct(savedProduct.id || id);
                    setSuccess('Produit verrouillé avec succès !');
                    setStatus('LOCKED');
                    setShowLockModal(false);
                    if (!isEdit) navigate(`/products/edit/${savedProduct.id}`);
                } catch (lockErr) {
                    setError('Le produit a été sauvegardé mais ne peut pas être verrouillé : ' +
                        (lockErr.response?.data?.error || 'Informations manquantes pour la conformité EU (Catégorie, Marque, GTIN).'));
                    setShowLockModal(false);
                }
            } else {
                setSuccess('Brouillon enregistré.');
                if (!isEdit) navigate(`/products/edit/${savedProduct.id}`);
            }
        } catch (err) {
            setError('Erreur lors de l\'enregistrement. Vérifiez que le GTIN est unique et les champs obligatoires.');
        } finally {
            setLoading(false);
        }
    };

    const addComponent = (comp) => {
        if (!formData.components.includes(comp.id)) {
            setFormData({
                ...formData,
                components: [...formData.components, comp.id]
            });
            setSelectedComponents([...selectedComponents, comp]);
        }
        setSearchTerm('');
    };

    const removeComponent = (compId) => {
        setFormData({
            ...formData,
            components: formData.components.filter(id => id !== compId)
        });
        setSelectedComponents(selectedComponents.filter(c => c.id !== compId));
    };

    const filteredSuggestions = searchTerm.length > 1
        ? availableComponents.filter(c =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
            !formData.components.includes(c.id)
        ).slice(0, 5)
        : [];

    const isLocked = status === 'LOCKED';

    return (
        <div className="mb-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <Link to="/products" className="text-decoration-none small">
                        <i className="fas fa-arrow-left me-1"></i> Retour au catalogue
                    </Link>
                    <h2 className="mt-2">
                        {isLocked ? 'Détails du Produit' : (isEdit ? 'Modifier le Produit' : 'Nouveau Produit')}
                    </h2>
                </div>
                <div className="d-flex gap-2">
                    {isArchived && <Badge bg="warning">Archivé</Badge>}
                    {status === 'DRAFT' && <Badge bg="secondary">Brouillon</Badge>}
                    {status === 'COMPLETE' && <Badge bg="success">Prêt</Badge>}
                    {status === 'LOCKED' && <Badge bg="primary"><i className="fas fa-lock me-1"></i> Verrouillé (DPP Généré)</Badge>}
                </div>
            </div>

            {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
            {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

            <Form onSubmit={(e) => handleSubmit(e, false)}>
                <Row>
                    <Col md={8}>
                        <Card className="mb-4">
                            <Card.Header className="bg-white py-3 fw-bold">Identification du modèle</Card.Header>
                            <Card.Body>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-medium">Nom commercial du produit *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                        disabled={isLocked}
                                        placeholder="Ex: Vélo Électrique E-Flow"
                                        aria-required="true"
                                    />
                                </Form.Group>

                                <Form.Group className="mb-4">
                                    <Form.Label className="fw-medium">Description</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={3}
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        disabled={isLocked}
                                    />
                                </Form.Group>

                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="fw-medium">GTIN / EAN *</Form.Label>
                                            <Form.Control
                                                type="text"
                                                maxLength={14}
                                                value={formData.gtin || ''}
                                                onChange={(e) => setFormData({ ...formData, gtin: e.target.value })}
                                                disabled={isLocked}
                                                placeholder="Code à 14 chiffres"
                                            />
                                            <Form.Text className="text-muted small">Unique et obligatoire pour la conformité finale.</Form.Text>
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="fw-medium">N° Modèle</Form.Label>
                                            <Form.Control
                                                type="text"
                                                value={formData.model_number}
                                                onChange={(e) => setFormData({ ...formData, model_number: e.target.value })}
                                                disabled={isLocked}
                                                placeholder="Ex: EF-2024-V1"
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>

                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="fw-medium">Catégorie EU</Form.Label>
                                            <Form.Control
                                                type="text"
                                                value={formData.category}
                                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                disabled={isLocked}
                                                placeholder="Ex: Batteries industrielles"
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="fw-medium">Marque</Form.Label>
                                            <Form.Control
                                                type="text"
                                                value={formData.brand}
                                                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                                disabled={isLocked}
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>
                            </Card.Body>
                        </Card>

                        <Card className="mb-4">
                            <Card.Header className="bg-white py-3 fw-bold d-flex justify-content-between">
                                Composants & Matériaux
                                <Badge bg="info">{formData.components.length}</Badge>
                            </Card.Header>
                            <Card.Body>
                                {!isLocked && (
                                    <div className="position-relative mb-4">
                                        <Form.Label className="fw-medium text-muted small">Rechercher et ajouter un composant :</Form.Label>
                                        <InputGroup>
                                            <InputGroup.Text><i className="fas fa-magnifying-glass"></i></InputGroup.Text>
                                            <Form.Control
                                                placeholder="Taper pour rechercher..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                aria-label="Rechercher des composants"
                                            />
                                        </InputGroup>

                                        {filteredSuggestions.length > 0 && (
                                            <ListGroup className="position-absolute w-100 shadow-sm z-3 mt-1" role="listbox">
                                                {filteredSuggestions.map(comp => (
                                                    <ListGroup.Item
                                                        key={comp.id}
                                                        action
                                                        onClick={() => addComponent(comp)}
                                                        role="option"
                                                    >
                                                        {comp.name} <span className="text-muted small">({comp.manufacturer || 'Fabricant inconnu'})</span>
                                                    </ListGroup.Item>
                                                ))}
                                            </ListGroup>
                                        )}
                                    </div>
                                )}

                                <div className="d-flex flex-wrap gap-2">
                                    {selectedComponents.map(comp => (
                                        <div key={comp.id} className="selected-chip">
                                            {comp.name}
                                            {!isLocked && (
                                                <span className="remove-btn" onClick={() => removeComponent(comp.id)} aria-label={`Retirer ${comp.name}`}>
                                                    <i className="fas fa-xmark"></i>
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                    {selectedComponents.length === 0 && (
                                        <p className="text-muted italic small mb-0">Aucun composant sélectionné.</p>
                                    )}
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>

                    <Col md={4}>
                        <Card className="mb-4 sticky-top" style={{ top: '100px', zIndex: 10 }}>
                            <Card.Body>
                                <h5 className="mb-3">Actions</h5>
                                <div className="d-grid gap-3">
                                    <Button
                                        type="submit"
                                        variant="outline-primary"
                                        disabled={loading || isLocked}
                                    >
                                        {loading ? 'Traitement...' : 'Enregistrer le brouillon'}
                                    </Button>

                                    {!isLocked && (
                                        <Button
                                            variant="dark"
                                            size="lg"
                                            onClick={() => setShowLockModal(true)}
                                            disabled={loading}
                                        >
                                            Valider & Verrouiller
                                        </Button>
                                    )}

                                    {isLocked && (
                                        <div className="alert alert-info py-2 small border-0">
                                            <p className="mb-0"><i className="fa-solid fa-circle-check me-1"></i> Ce produit est verrouillé pour assurer l'immuabilité du Passeport Numérique.</p>
                                            <hr />
                                            <Link to="/qr-generator" className="btn btn-sm btn-primary w-100 shadow-sm">Générer les Digital Twins</Link>
                                        </div>
                                    )}
                                </div>
                                <hr />
                                <div className="text-muted small">
                                    <p className="mb-1">Statut : <strong>{status}</strong></p>
                                    <p className="mb-0">Note : La date de fabrication est définie lors de la génération de chaque Digital Twin.</p>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Form>

            {/* Confirmation Modal for Locking */}
            <Modal show={showLockModal} onHide={() => setShowLockModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Confirmer le verrouillage</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="text-center mb-4">
                        <i className="fa-solid fa-triangle-exclamation text-warning display-4 mb-3"></i>
                        <p className="fw-bold">Cette action est irréversible !</p>
                    </div>
                    <p>Le verrouillage fige les données du produit (Nom, Marque, Composants) pour générer le Passeport Numérique conforme aux réglementations UE.</p>
                    <p>Une fois verrouillé, vous ne pourrez plus modifier ces informations. Souhaitez-vous continuer ?</p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="light" onClick={() => setShowLockModal(false)}>
                        Annuler
                    </Button>
                    <Button variant="dark" onClick={(e) => handleSubmit(e, true)} disabled={loading}>
                        {loading ? 'Traitement...' : 'Oui, Valider & Verrouiller'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default ProductForm;
