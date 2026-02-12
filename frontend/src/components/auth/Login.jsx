import React, { useState } from 'react';
import { Card, Form, Button, Alert } from 'react-bootstrap';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../../services/auth';
import SocialLoginButtons from '../SocialLoginButtons';

const Login = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    // Check URL params for messages
    React.useEffect(() => {
        if (searchParams.get('verified') === 'true') {
            setSuccess('Votre adresse email a été validée avec succès ! Vous pouvez maintenant vous connecter.');
        }
        if (searchParams.get('password_reset') === 'true') {
            setSuccess('Votre mot de passe a été modifié avec succès. Vous pouvez maintenant vous connecter.');
        }
    }, [searchParams]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            await authService.login(formData.email, formData.password);
            await authService.getCurrentUser();
            navigate('/dashboard');
        } catch (err) {
            const data = err.response?.data;

            // Handle email not verified error
            if (data?.non_field_errors) {
                const errorObj = data.non_field_errors[0];
                if (typeof errorObj === 'object' && (errorObj.code === 'EMAIL_NOT_VERIFIED' || errorObj.code === 'ACCOUNT_INACTIVE')) {
                    const emailForResend = errorObj.email || formData.email;
                    setError(
                        <span>
                            {errorObj.error}{' '}
                            <Button
                                variant="link"
                                type="button"
                                className="p-0 align-baseline"
                                onClick={() => handleResendVerification(emailForResend)}
                            >
                                Renvoyer le lien
                            </Button>
                        </span>
                    );
                } else {
                    setError(typeof errorObj === 'string' ? errorObj : (errorObj.error || JSON.stringify(errorObj)));
                }
            } else {
                setError(data?.detail || data?.error || 'Erreur de connexion');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResendVerification = async (email) => {
        try {
            const result = await authService.resendVerification(email);
            setSuccess(result.detail || result.message || 'Email de vérification envoyé');
            setError('');
        } catch (err) {
            setError(err.response?.data?.error || err.response?.data?.detail || 'Erreur lors de l\'envoi');
        }
    };

    const handleSocialSuccess = () => {
        navigate('/dashboard');
    };

    return (
        <div className="auth-container">
            <Card className="auth-card">
                <Card.Body>
                    <h2 className="text-center mb-4">Connexion</h2>

                    {error && <Alert variant="danger">{error}</Alert>}
                    {success && <Alert variant="success">{success}</Alert>}

                    <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label>Email</Form.Label>
                            <Form.Control
                                type="email"
                                placeholder="email@exemple.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Mot de passe</Form.Label>
                            <Form.Control
                                type="password"
                                placeholder="Mot de passe"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                            />
                        </Form.Group>

                        <div className="mb-3 text-end">
                            <Link to="/auth/password-reset">Mot de passe oublié ?</Link>
                        </div>

                        <Button variant="primary" type="submit" className="w-100" disabled={loading}>
                            {loading ? 'Connexion...' : 'Se connecter'}
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
                        Pas encore de compte ? <Link to="/auth/signup">S'inscrire</Link>
                    </div>
                </Card.Body>
            </Card>
        </div>
    );
};

export default Login;
