import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Alert, Tabs, Tab } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import SocialLoginButtons from '../components/SocialLoginButtons';

const Login = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('login');
    const [loginData, setLoginData] = useState({ email: '', password: '' });
    const [registerData, setRegisterData] = useState({
        email: '',
        company_name: '',
        password1: '',
        password2: '',
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('verified') === 'true') {
            setSuccess('Votre adresse email a été validée avec succès ! Vous pouvez maintenant vous connecter.');
        }
        if (params.get('deleted') === 'true') {
            setSuccess('Votre compte a été supprimé définitivement.');
        }
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await authService.login(loginData.email, loginData.password);
            await authService.getCurrentUser();
            navigate('/dashboard');
        } catch (err) {
            const data = err.response?.data;
            if (data?.code === 'EMAIL_NOT_VERIFIED' || data?.code === 'ACCOUNT_INACTIVE') {
                setError(
                    <span>
                        {data.error}{' '}
                        <Button
                            variant="link"
                            type="button"
                            className="p-0 align-baseline"
                            onClick={() => handleResendVerification(data.email)}
                        >
                            Renvoyer le lien
                        </Button>
                    </span>
                );
            } else {
                setError(data?.error || data?.detail || 'Erreur de connexion');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResendVerification = async (email) => {
        try {
            const result = await authService.resendVerification(email);
            setSuccess(result.message);
            setError('');
        } catch (err) {
            setError(err.response?.data?.error || 'Erreur lors de l\'envoi');
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        if (registerData.password1 !== registerData.password2) {
            setError('Les mots de passe ne correspondent pas');
            setLoading(false);
            return;
        }

        try {
            await authService.register(
                registerData.email,
                registerData.company_name,
                registerData.password1,
                registerData.password2
            );
            setSuccess('Compte créé avec succès ! Vérifiez votre email pour activer votre compte.');
            setRegisterData({ email: '', company_name: '', password1: '', password2: '' });
        } catch (err) {
            const errors = err.response?.data;
            if (errors && typeof errors === 'object') {
                const errorMessages = Object.entries(errors)
                    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
                    .join(' | ');
                setError(errorMessages);
            } else if (typeof errors === 'string' && !errors.startsWith('<!DOCTYPE')) {
                setError(errors);
            } else {
                setError('Erreur lors de la création du compte (Le serveur a renvoyé une erreur).');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSocialSuccess = () => {
        // Called after successful OAuth login
        navigate('/dashboard');
    };

    return (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '70vh' }}>
            <Card style={{ width: '500px' }}>
                <Card.Body>
                    <h2 className="text-center mb-4">Digital Product Passport</h2>

                    <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-3">
                        <Tab eventKey="login" title="Connexion">
                            {error && activeTab === 'login' && <Alert variant="danger">{error}</Alert>}

                            <Form onSubmit={handleLogin}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Email</Form.Label>
                                    <Form.Control
                                        type="email"
                                        placeholder="email@exemple.com"
                                        value={loginData.email}
                                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                                        required
                                    />
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>Mot de passe</Form.Label>
                                    <Form.Control
                                        type="password"
                                        placeholder="Mot de passe"
                                        value={loginData.password}
                                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                                        required
                                    />
                                </Form.Group>

                                <Button variant="primary" type="submit" className="w-100" disabled={loading}>
                                    {loading ? 'Connexion...' : 'Se connecter'}
                                </Button>
                            </Form>

                            {/* Divider */}
                            <div className="d-flex align-items-center my-4">
                                <hr className="flex-grow-1" />
                                <span className="mx-3 text-muted">OU</span>
                                <hr className="flex-grow-1" />
                            </div>

                            {/* Social Login Buttons */}
                            <SocialLoginButtons
                                variant="outline-secondary"
                                onSuccess={handleSocialSuccess}
                            />
                        </Tab>

                        <Tab eventKey="register" title="Inscription">
                            {error && activeTab === 'register' && <Alert variant="danger">{error}</Alert>}
                            {success && activeTab === 'register' && <Alert variant="success">{success}</Alert>}

                            <Form onSubmit={handleRegister}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Email</Form.Label>
                                    <Form.Control
                                        type="email"
                                        placeholder="email@exemple.com"
                                        value={registerData.email}
                                        onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                                        required
                                    />
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>Nom de l'entreprise</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Mon Entreprise SAS"
                                        value={registerData.company_name}
                                        onChange={(e) => setRegisterData({ ...registerData, company_name: e.target.value })}
                                        required
                                    />
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>Mot de passe</Form.Label>
                                    <Form.Control
                                        type="password"
                                        placeholder="Mot de passe"
                                        value={registerData.password1}
                                        onChange={(e) => setRegisterData({ ...registerData, password1: e.target.value })}
                                        required
                                    />
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>Confirmer le mot de passe</Form.Label>
                                    <Form.Control
                                        type="password"
                                        placeholder="Confirmer le mot de passe"
                                        value={registerData.password2}
                                        onChange={(e) => setRegisterData({ ...registerData, password2: e.target.value })}
                                        required
                                    />
                                </Form.Group>

                                <Button variant="success" type="submit" className="w-100" disabled={loading}>
                                    {loading ? 'Création...' : 'Créer un compte'}
                                </Button>
                            </Form>

                            {/* Divider */}
                            <div className="d-flex align-items-center my-4">
                                <hr className="flex-grow-1" />
                                <span className="mx-3 text-muted">OU</span>
                                <hr className="flex-grow-1" />
                            </div>

                            {/* Social Login Buttons */}
                            <SocialLoginButtons
                                variant="outline-secondary"
                                onSuccess={handleSocialSuccess}
                            />
                        </Tab>
                    </Tabs>
                </Card.Body>
            </Card>
        </div>
    );
};

export default Login;

