import React, { useState } from 'react';
import { Form, Button, Row, Col } from 'react-bootstrap';

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
}) => {
    const [newMaterial, setNewMaterial] = useState('');
    const [newPercent, setNewPercent] = useState('');
    const [newCert, setNewCert] = useState('');

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

    const addCertification = () => {
        if (newCert && !formData.certifications.includes(newCert)) {
            setFormData((prev) => ({
                ...prev,
                certifications: [...prev.certifications, newCert]
            }));
            setNewCert('');
        }
    };

    const removeCertification = (cert) => {
        setFormData((prev) => ({
            ...prev,
            certifications: prev.certifications.filter(c => c !== cert)
        }));
    };

    return (
        <Form onSubmit={onSubmit}>
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
                        <Form.Label className="fw-medium">Fabricant / Fournisseur</Form.Label>
                        <Form.Control
                            type="text"
                            value={formData.manufacturer}
                            onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                            placeholder="Nom de l'entité"
                            readOnly={readOnly}
                        />
                    </Form.Group>
                </Col>
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
                {formData.certifications.length > 0 && (
                    <div className="mb-2">
                        {formData.certifications.map(cert => (
                            <span key={cert} className="selected-chip">
                                {cert}
                                {!readOnly && (
                                    <span className="remove-btn" onClick={() => removeCertification(cert)}>×</span>
                                )}
                            </span>
                        ))}
                    </div>
                )}
                {!readOnly && (
                    <div className="d-flex gap-2">
                        <Form.Control
                            type="text"
                            placeholder="Ex: CE, RoHS"
                            value={newCert}
                            onChange={(e) => setNewCert(e.target.value)}
                            size="sm"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') { e.preventDefault(); addCertification(); }
                            }}
                        />
                        <Button variant="outline-primary" size="sm" onClick={addCertification} type="button">
                            <i className="fas fa-plus"></i>
                        </Button>
                    </div>
                )}
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
