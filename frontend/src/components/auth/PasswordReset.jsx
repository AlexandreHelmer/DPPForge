import React, { useState } from 'react';
import { Card, Form, Button, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { authService } from '../../services/auth';

const PasswordReset = () => {
    const [email, setEmail] = useState('');
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            await authService.requestPasswordReset(email);
            setSuccess('Un email avec les instructions pour réinitialiser votre mot de passe a été envoyé.');
            setEmail('');
        } catch (err) {
            const data = err.response?.data;
            if (data && typeof data === 'object') {
                const errorMsg = Object.entries(data)
                    .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(' ') : val}`)
                    .join(' | ');
                setError(errorMsg);
            } else {
                setError(data?.detail || data?.error || 'Erreur lors de l\'envoi de l\'email');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <Card className="auth-card">
                <Card.Body>
                    <h2 className="text-center mb-4">Réinitialiser le mot de passe</h2>

                    {error && <Alert variant="danger">{error}</Alert>}
                    {success && <Alert variant="success">{success}</Alert>}

                    <p className="text-muted mb-4">
                        Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
                    </p>

                    <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label>Email</Form.Label>
                            <Form.Control
                                type="email"
                                placeholder="email@exemple.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </Form.Group>

                        <Button variant="primary" type="submit" className="w-100" disabled={loading}>
                            {loading ? 'Envoi...' : 'Envoyer le lien'}
                        </Button>
                    </Form>

                    <div className="mt-3 text-center">
                        <Link to="/auth/login">Retour à la connexion</Link>
                    </div>
                </Card.Body>
            </Card>
        </div>
    );
};

export default PasswordReset;
