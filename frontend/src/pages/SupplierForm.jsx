import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Form, Alert, Card, Spinner, Badge, Table } from 'react-bootstrap';
import { productsService } from '../services/products';

const SupplierForm = () => {
    const { token } = useParams();

    // States
    const [step, setStep] = useState('loading'); // loading, password, form, submitted, error
    const [linkInfo, setLinkInfo] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [errorReason, setErrorReason] = useState('');
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submittedData, setSubmittedData] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        manufacturer: '',
        material_composition: {},
        certifications: [],
        origin_country: '',
        gtin: '',
        supplier_email: '',
    });

    // Material composition helpers
    const [newMaterial, setNewMaterial] = useState('');
    const [newPercent, setNewPercent] = useState('');

    // Certifications helper
    const [newCert, setNewCert] = useState('');

    useEffect(() => {
        validateToken();
        // eslint-disable-next-line
    }, [token]);

    const validateToken = async () => {
        try {
            const data = await productsService.getPublicSupplierLink(token);
            setLinkInfo(data);

            if (data.authenticated) {
                // No password needed, go straight to form
                populateForm(data.fields_to_fill);
                setStep('form');
            } else {
                // Password required
                setStep('password');
            }
        } catch (err) {
            const reason = err.response?.data?.reason || '';
            const msg = err.response?.data?.error || 'Ce lien est invalide ou a expiré.';
            setErrorMessage(msg);
            setErrorReason(reason);
            setStep('error');
        }
    };

    const populateForm = (fields) => {
        if (fields) {
            setFormData({
                name: fields.name || '',
                description: fields.description || '',
                manufacturer: fields.manufacturer || '',
                material_composition: fields.material_composition || {},
                certifications: fields.certifications || [],
                origin_country: fields.origin_country || '',
                gtin: fields.gtin || '',
                supplier_email: '',
            });
        }
    };

    const handleVerifyPassword = async (e) => {
        e.preventDefault();
        setPasswordError('');
        try {
            const data = await productsService.verifySupplierPassword(token, password);
            if (data.authenticated) {
                populateForm(data.fields_to_fill);
                setStep('form');
            }
        } catch (err) {
            setPasswordError(err.response?.data?.error || 'Mot de passe incorrect.');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setErrorMessage('');

        try {
            const submitData = { ...formData };
            // If password-protected, include password for re-verification
            if (linkInfo?.is_password_protected) {
                submitData.password = password;
            }
            const result = await productsService.submitSupplierData(token, submitData);
            setSubmittedData(result.component);
            setStep('submitted');
        } catch (err) {
            setErrorMessage(err.response?.data?.error || 'Erreur lors de l\'envoi des données.');
        } finally {
            setSubmitting(false);
        }
    };

    // Material composition management
    const addMaterial = () => {
        if (newMaterial && newPercent) {
            setFormData({
                ...formData,
                material_composition: {
                    ...formData.material_composition,
                    [newMaterial]: parseInt(newPercent) || 0
                }
            });
            setNewMaterial('');
            setNewPercent('');
        }
    };

    const removeMaterial = (key) => {
        const newComp = { ...formData.material_composition };
        delete newComp[key];
        setFormData({ ...formData, material_composition: newComp });
    };

    // Certifications management
    const addCertification = () => {
        if (newCert && !formData.certifications.includes(newCert)) {
            setFormData({
                ...formData,
                certifications: [...formData.certifications, newCert]
            });
            setNewCert('');
        }
    };

    const removeCertification = (cert) => {
        setFormData({
            ...formData,
            certifications: formData.certifications.filter(c => c !== cert)
        });
    };

    const getErrorIcon = () => {
        switch (errorReason) {
            case 'expired': return 'fa-clock';
            case 'revoked': return 'fa-ban';
            case 'submitted': return 'fa-check-circle';
            default: return 'fa-exclamation-triangle';
        }
    };

    // =====================
    // RENDER
    // =====================

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem 1rem'
        }}>
            <div style={{ width: '100%', maxWidth: '700px' }}>
                {/* Header */}
                <div className="text-center mb-4">
                    <h2 className="text-white fw-bold mb-1">
                        <i className="fas fa-shield-alt me-2"></i>DPPForge
                    </h2>
                    <p className="text-white-50 mb-0">Portail Fournisseur</p>
                </div>

                {/* Loading */}
                {step === 'loading' && (
                    <Card className="shadow-lg border-0" style={{ borderRadius: '16px' }}>
                        <Card.Body className="text-center p-5">
                            <Spinner animation="border" variant="primary" className="mb-3" />
                            <p className="text-muted mb-0">Vérification du lien...</p>
                        </Card.Body>
                    </Card>
                )}

                {/* Error */}
                {step === 'error' && (
                    <Card className="shadow-lg border-0" style={{ borderRadius: '16px' }}>
                        <Card.Body className="text-center p-5">
                            <div className="mb-4">
                                <i className={`fas ${getErrorIcon()} text-danger`} style={{ fontSize: '3rem' }}></i>
                            </div>
                            <h4 className="fw-bold mb-3">Lien invalide</h4>
                            <p className="text-muted mb-0">{errorMessage}</p>
                        </Card.Body>
                    </Card>
                )}

                {/* Password Gate */}
                {step === 'password' && (
                    <Card className="shadow-lg border-0" style={{ borderRadius: '16px' }}>
                        <Card.Body className="p-4 p-md-5">
                            <div className="text-center mb-4">
                                <i className="fas fa-lock text-warning" style={{ fontSize: '2.5rem' }}></i>
                                <h4 className="fw-bold mt-3">Accès protégé</h4>
                                <p className="text-muted">
                                    <strong>{linkInfo?.company_name}</strong> vous demande de compléter les informations du composant <strong>« {linkInfo?.component_name} »</strong>.
                                </p>
                                <p className="text-muted small">Saisissez le mot de passe fourni par votre interlocuteur.</p>
                            </div>

                            {passwordError && <Alert variant="danger">{passwordError}</Alert>}

                            <Form onSubmit={handleVerifyPassword}>
                                <Form.Group className="mb-4">
                                    <Form.Control
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Mot de passe"
                                        size="lg"
                                        required
                                        autoFocus
                                    />
                                </Form.Group>
                                <Button type="submit" variant="primary" size="lg" className="w-100 shadow-sm">
                                    <i className="fas fa-unlock me-2"></i>Accéder au formulaire
                                </Button>
                            </Form>
                        </Card.Body>
                    </Card>
                )}

                {/* Component Form */}
                {step === 'form' && (
                    <Card className="shadow-lg border-0" style={{ borderRadius: '16px' }}>
                        <Card.Body className="p-4 p-md-5">
                            <div className="text-center mb-4">
                                <Badge bg="primary" className="px-3 py-2 mb-3" style={{ fontSize: '0.8rem' }}>
                                    <i className="fas fa-building me-1"></i>{linkInfo?.company_name}
                                </Badge>
                                <h4 className="fw-bold mb-1">Informations du composant</h4>
                                <p className="text-muted">
                                    Complétez ou corrigez les informations ci-dessous pour <strong>« {linkInfo?.component_name} »</strong>.
                                </p>
                            </div>

                            {errorMessage && <Alert variant="danger" dismissible onClose={() => setErrorMessage('')}>{errorMessage}</Alert>}

                            <Form onSubmit={handleSubmit}>
                                <Form.Group className="mb-4">
                                    <Form.Label className="fw-medium">Désignation du composant *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </Form.Group>

                                <Form.Group className="mb-4">
                                    <Form.Label className="fw-medium">Description technique</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={3}
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </Form.Group>

                                <div className="row">
                                    <div className="col-md-6">
                                        <Form.Group className="mb-4">
                                            <Form.Label className="fw-medium">Fabricant</Form.Label>
                                            <Form.Control
                                                type="text"
                                                value={formData.manufacturer}
                                                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                                                placeholder="Nom du fabricant"
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

                                {/* Material Composition */}
                                <Form.Group className="mb-4">
                                    <Form.Label className="fw-medium">Composition matérielle (%)</Form.Label>
                                    {Object.keys(formData.material_composition).length > 0 && (
                                        <div className="mb-2">
                                            {Object.entries(formData.material_composition).map(([mat, pct]) => (
                                                <span key={mat} className="selected-chip">
                                                    {mat}: {pct}%
                                                    <span className="remove-btn" onClick={() => removeMaterial(mat)}>×</span>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    <div className="d-flex gap-2">
                                        <Form.Control
                                            type="text"
                                            placeholder="Matériau (ex: plastique)"
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
                                </Form.Group>

                                {/* Certifications */}
                                <Form.Group className="mb-4">
                                    <Form.Label className="fw-medium">Certifications</Form.Label>
                                    {formData.certifications.length > 0 && (
                                        <div className="mb-2">
                                            {formData.certifications.map(cert => (
                                                <span key={cert} className="selected-chip">
                                                    {cert}
                                                    <span className="remove-btn" onClick={() => removeCertification(cert)}>×</span>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    <div className="d-flex gap-2">
                                        <Form.Control
                                            type="text"
                                            placeholder="Ex: CE, RoHS, REACH"
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
                                </Form.Group>

                                <hr />

                                {/* Supplier email */}
                                <Form.Group className="mb-4">
                                    <Form.Label className="fw-medium">Votre email (optionnel)</Form.Label>
                                    <Form.Control
                                        type="email"
                                        value={formData.supplier_email}
                                        onChange={(e) => setFormData({ ...formData, supplier_email: e.target.value })}
                                        placeholder="votre@email.com"
                                    />
                                    <Form.Text className="text-muted">
                                        Pour permettre à la marque de vous recontacter si besoin.
                                    </Form.Text>
                                </Form.Group>

                                <Button
                                    type="submit"
                                    variant="primary"
                                    size="lg"
                                    className="w-100 shadow-sm"
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <>
                                            <Spinner animation="border" size="sm" className="me-2" />
                                            Envoi en cours...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-paper-plane me-2"></i>
                                            Soumettre les informations
                                        </>
                                    )}
                                </Button>
                            </Form>
                        </Card.Body>
                    </Card>
                )}

                {/* Submitted — Summary */}
                {step === 'submitted' && submittedData && (
                    <Card className="shadow-lg border-0" style={{ borderRadius: '16px' }}>
                        <Card.Body className="p-4 p-md-5">
                            <div className="text-center mb-4">
                                <div className="mb-3">
                                    <i className="fas fa-check-circle text-success" style={{ fontSize: '4rem' }}></i>
                                </div>
                                <h3 className="fw-bold text-success mb-2">Informations envoyées !</h3>
                                <p className="text-muted">
                                    Merci pour votre contribution. La marque <strong>{linkInfo?.company_name}</strong> a été notifiée.
                                    Le composant est maintenant verrouillé.
                                </p>
                            </div>

                            <h5 className="fw-bold mb-3">Récapitulatif</h5>
                            <Table bordered hover size="sm" className="mb-0">
                                <tbody>
                                    <tr>
                                        <td className="fw-medium" style={{ width: '35%' }}>Désignation</td>
                                        <td>{submittedData.name}</td>
                                    </tr>
                                    {submittedData.description && (
                                        <tr>
                                            <td className="fw-medium">Description</td>
                                            <td>{submittedData.description}</td>
                                        </tr>
                                    )}
                                    {submittedData.manufacturer && (
                                        <tr>
                                            <td className="fw-medium">Fabricant</td>
                                            <td>{submittedData.manufacturer}</td>
                                        </tr>
                                    )}
                                    {submittedData.origin_country && (
                                        <tr>
                                            <td className="fw-medium">Pays d'origine</td>
                                            <td>{submittedData.origin_country}</td>
                                        </tr>
                                    )}
                                    {submittedData.gtin && (
                                        <tr>
                                            <td className="fw-medium">GTIN</td>
                                            <td><code>{submittedData.gtin}</code></td>
                                        </tr>
                                    )}
                                    {submittedData.material_composition && Object.keys(submittedData.material_composition).length > 0 && (
                                        <tr>
                                            <td className="fw-medium">Composition</td>
                                            <td>{Object.entries(submittedData.material_composition).map(([k, v]) => `${k}: ${v}%`).join(', ')}</td>
                                        </tr>
                                    )}
                                    {submittedData.certifications && submittedData.certifications.length > 0 && (
                                        <tr>
                                            <td className="fw-medium">Certifications</td>
                                            <td>{submittedData.certifications.map(c => (
                                                <Badge key={c} bg="light" className="text-dark border me-1">{c}</Badge>
                                            ))}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                )}

                {/* Footer */}
                <div className="text-center mt-4">
                    <p className="text-white-50 small mb-0">
                        Propulsé par <strong className="text-white">DPPForge</strong> — Digital Product Passport conforme UE
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SupplierForm;
