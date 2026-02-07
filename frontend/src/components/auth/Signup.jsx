import React, { useState } from 'react';
import { Card, Form, Button, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth';
import SocialLoginButtons from '../SocialLoginButtons';

const Signup = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        company_name: '',
        company_registration: '',
        password1: '',
        password2: '',
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        if (formData.password1 !== formData.password2) {
            setError('Les mots de passe ne correspondent pas');
            setLoading(false);
            return;
        }

        try {
            await authService.register(
                formData.email,
                formData.company_name,
                formData.password1,
                formData.password2,
                formData.company_registration
            );
            setSuccess('Compte créé avec succès ! Vérifiez votre email pour activer votre compte.');
            setFormData({
                email: '',
                company_name: '',
                company_registration: '',
                password1: '',
                password2: '',
            });
        } catch (err) {
            const errors = err.response?.data;
            if (errors && typeof errors === 'object') {
                const errorMessages = Object.entries(errors)
                    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
                    .join(' | ');
                setError(errorMessages);
            } else if (typeof errors === 'string') {
                setError(errors);
            } else {
                setError('Erreur lors de la création du compte.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSocialSuccess = () => {
        navigate('/dashboard');
    };

    return (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '70vh' }}>
            <Card style={{ width: '500px' }}>
                <Card.Body>
                    <h2 className="text-center mb-4">Inscription</h2>

                    {error && <Alert variant="danger">{error}</Alert>}
                    {success && <Alert variant="success">{success}</Alert>}

                    <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label>Email *</Form.Label>
                            <Form.Control
                                type="email"
                                placeholder="email@exemple.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Nom de l'entreprise *</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Mon Entreprise SAS"
                                value={formData.company_name}
                                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                                required
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Numéro SIREN/SIRET (optionnel)</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="123 456 789"
                                value={formData.company_registration}
                                onChange={(e) => setFormData({ ...formData, company_registration: e.target.value })}
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Mot de passe *</Form.Label>
                            <Form.Control
                                type="password"
                                placeholder="Mot de passe"
                                value={formData.password1}
                                onChange={(e) => setFormData({ ...formData, password1: e.target.value })}
                                required
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Confirmer le mot de passe *</Form.Label>
                            <Form.Control
                                type="password"
                                placeholder="Confirmer le mot de passe"
                                value={formData.password2}
                                onChange={(e) => setFormData({ ...formData, password2: e.target.value })}
                                required
                            />
                        </Form.Group>

                        <Button variant="success" type="submit" className="w-100" disabled={loading}>
                            {loading ? 'Création...' : 'Créer un compte'}
                        </Button>
                    </Form>

                    <div className="d-flex align-items-center my-4">
                        <hr className="flex-grow-1" />
                        <span className="mx-3 text-muted">OU</span>
                        <hr className="flex-grow-1" />
                    </div>

                    <SocialLoginButtons
                        variant="outline-secondary"
                        onSuccess={handleSocialSuccess}
                    />

                    <div className="mt-3 text-center">
                        Déjà un compte ? <Link to="/auth/login">Se connecter</Link>
                    </div>
                </Card.Body>
            </Card>
        </div>
    );
};

export default Signup;
