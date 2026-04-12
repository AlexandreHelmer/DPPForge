import React, { useState } from 'react';
import { Form, Button, Row, Col } from 'react-bootstrap';
import { EU_CERTIFICATION_SUGGESTIONS } from '../constants/regulatoryOptions';
import TagSuggestionInput from './TagSuggestionInput';

const ComponentForm = ({
    formData,
    setFormData,
    onSubmit,
    onCancel,
    loading = false,
    readOnly = false,
    submitLabel = 'Sauvegarder',
    cancelLabel = 'Annuler',
    showSubmit = true,
    showCancel = true,
    certificationSuggestions = EU_CERTIFICATION_SUGGESTIONS,
}) => {
    const [newMaterial, setNewMaterial] = useState('');
    const [newPercent, setNewPercent] = useState('');

    const addMaterial = () => {
        if (newMaterial && newPercent) {
            setFormData((prev) => ({
                ...prev,
                material_composition: {
                    ...prev.material_composition,
                    [newMaterial]: parseInt(newPercent, 10)
                }
            }));
            setNewMaterial('');
            setNewPercent('');
        }
    };

    const removeMaterial = (material) => {
        setFormData((prev) => {
            const updated = { ...prev.material_composition };
            delete updated[material];
            return { ...prev, material_composition: updated };
        });
    };

    const addCertification = (certification) => {
        if (!certification || formData.certifications.includes(certification)) return;
        setFormData((prev) => ({
            ...prev,
            certifications: [...prev.certifications, certification]
        }));
    };

    const removeCertification = (cert) => {
        setFormData((prev) => ({
            ...prev,
            certifications: prev.certifications.filter(c => c !== cert)
        }));
    };

    const handlePreventEnterSubmit = (e) => {
        if (e.key !== 'Enter') return;
        const tag = e.target?.tagName?.toLowerCase();
        const allowsEnterAdd = e.target?.dataset?.enterAdd === 'true';
        if (!allowsEnterAdd && tag !== 'textarea') {
            e.preventDefault();
        }
    };

    return (
        <Form onSubmit={onSubmit} onKeyDownCapture={handlePreventEnterSubmit}>
            <Form.Group className="mb-4">
                <Form.Label className="fw-medium">Désignation *</Form.Label>
                <Form.Control
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Ex: Module de commande électronique v4"
                    readOnly={readOnly}
                />
            </Form.Group>

            <Form.Group className="mb-4">
                <Form.Label className="fw-medium">Description technique</Form.Label>
                <Form.Control
                    as="textarea"
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    readOnly={readOnly}
                />
            </Form.Group>

            <Row>
                <Col md={6}>
                    <Form.Group className="mb-4">
                        <Form.Label className="fw-medium">Fabricant</Form.Label>
                        <Form.Control
                            type="text"
                            value={formData.manufacturer}
                            onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                            placeholder="Nom du fabricant"
                            readOnly={readOnly}
                        />
                    </Form.Group>
                </Col>
                <Col md={6}>
                    <Form.Group className="mb-4">
                        <Form.Label className="fw-medium">Fournisseur</Form.Label>
                        <Form.Control
                            type="text"
                            value={formData.supplier || ''}
                            onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                            placeholder="Nom du fournisseur (optionnel)"
                            readOnly={readOnly}
                        />
                    </Form.Group>
                </Col>
            </Row>

            <Row>
                <Col md={6}>
                    <Form.Group className="mb-4">
                        <Form.Label className="fw-medium">Pays d'origine</Form.Label>
                        <Form.Control
                            type="text"
                            value={formData.origin_country}
                            onChange={(e) => setFormData({ ...formData, origin_country: e.target.value })}
                            placeholder="Ex: France"
                            readOnly={readOnly}
                        />
                    </Form.Group>
                </Col>
                <Col md={6}>
                    <Form.Group className="mb-4">
                        <Form.Label className="fw-medium">Marque</Form.Label>
                        <Form.Control
                            type="text"
                            value={formData.brand || ''}
                            onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                            placeholder="Optionnel"
                            readOnly={readOnly}
                        />
                    </Form.Group>
                </Col>
            </Row>

            <Form.Group className="mb-4">
                <Form.Label className="fw-medium">GTIN (Global Trade Item Number)</Form.Label>
                <Form.Control
                    type="text"
                    value={formData.gtin}
                    onChange={(e) => setFormData({ ...formData, gtin: e.target.value })}
                    maxLength={14}
                    placeholder="Code barres à 14 chiffres"
                    readOnly={readOnly}
                />
            </Form.Group>

            <Form.Group className="mb-4">
                <Form.Label className="fw-medium">Composition matérielle (%)</Form.Label>
                {Object.keys(formData.material_composition).length > 0 && (
                    <div className="mb-2">
                        {Object.entries(formData.material_composition).map(([mat, pct]) => (
                            <span key={mat} className="selected-chip">
                                {mat}: {pct}%
                                {!readOnly && (
                                    <span className="remove-btn" onClick={() => removeMaterial(mat)}>×</span>
                                )}
                            </span>
                        ))}
                    </div>
                )}
                {!readOnly && (
                    <div className="d-flex gap-2">
                        <Form.Control
                            type="text"
                            placeholder="Matériau (ex: coton)"
                            value={newMaterial}
                            onChange={(e) => setNewMaterial(e.target.value)}
                            size="sm"
                        />
                        <Form.Control
                            type="number"
                            placeholder="%"
                            value={newPercent}
                            onChange={(e) => setNewPercent(e.target.value)}
                            size="sm"
                            style={{ width: '80px' }}
                            min={0}
                            max={100}
                        />
                        <Button variant="outline-primary" size="sm" onClick={addMaterial} type="button">
                            <i className="fas fa-plus"></i>
                        </Button>
                    </div>
                )}
            </Form.Group>

            <Form.Group className="mb-4">
                <Form.Label className="fw-medium">Certifications</Form.Label>
                <TagSuggestionInput
                    tags={formData.certifications}
                    suggestions={certificationSuggestions}
                    onAdd={addCertification}
                    onRemove={removeCertification}
                    placeholder="Rechercher et ajouter une certification..."
                    disabled={readOnly}
                />
            </Form.Group>

            {(showCancel || showSubmit) && (
                <div className="d-flex justify-content-end mt-4 pt-3 border-top gap-2">
                    {showCancel && (
                        <Button variant="light" onClick={onCancel} type="button">
                            {cancelLabel}
                        </Button>
                    )}
                    {showSubmit && !readOnly && (
                        <Button type="submit" variant="primary" disabled={loading} className="px-5 shadow-sm">
                            {loading ? 'Enregistrement...' : submitLabel}
                        </Button>
                    )}
                </div>
            )}
        </Form>
    );
};

export default ComponentForm;
