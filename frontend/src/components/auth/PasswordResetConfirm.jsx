import React, { useState } from 'react';
import { Card, Form, Button, Alert } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth';

const PasswordResetConfirm = () => {
    const { key } = useParams();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ new_password1: '', new_password2: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (formData.new_password1 !== formData.new_password2) {
            setError('Les mots de passe ne correspondent pas');
            return;
        }

        setLoading(true);

        try {
            await authService.confirmPasswordReset(
                key, // UID-TOKEN
                formData.new_password1,
                formData.new_password2
            );
            setSuccess('Votre mot de passe a été modifié avec succès.');

            // Redirect to login after 2 seconds
            setTimeout(() => {
                navigate('/auth/login?password_reset=true');
            }, 2000);
        } catch (err) {
            const errors = err.response?.data;
            if (errors && typeof errors === 'object') {
                const errorMessages = Object.entries(errors)
                    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
                    .join(' | ');
                setError(errorMessages);
            } else {
                setError('Erreur lors de la réinitialisation. Le lien est peut-être expiré.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '70vh' }}>
            <Card style={{ width: '500px' }}>
                <Card.Body>
                    <h2 className="text-center mb-4">Nouveau mot de passe</h2>

                    {error && <Alert variant="danger">{error}</Alert>}
                    {success && <Alert variant="success">{success}</Alert>}

                    <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label>Nouveau mot de passe</Form.Label>
                            <Form.Control
                                type="password"
                                placeholder="Nouveau mot de passe"
                                value={formData.new_password1}
                                onChange={(e) => setFormData({ ...formData, new_password1: e.target.value })}
                                required
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Confirmer le mot de passe</Form.Label>
                            <Form.Control
                                type="password"
                                placeholder="Confirmer le mot de passe"
                                value={formData.new_password2}
                                onChange={(e) => setFormData({ ...formData, new_password2: e.target.value })}
                                required
                            />
                        </Form.Group>

                        <Button variant="primary" type="submit" className="w-100" disabled={loading}>
                            {loading ? 'Modification...' : 'Réinitialiser le mot de passe'}
                        </Button>
                    </Form>
                </Card.Body>
            </Card>
        </div>
    );
};

export default PasswordResetConfirm;
