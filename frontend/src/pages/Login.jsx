import React, { useState } from 'react';
import { Card, Form, Button, Alert, Tabs, Tab } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';

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

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await authService.login(loginData.email, loginData.password);
            await authService.getCurrentUser();
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.detail || 'Erreur de connexion');
        } finally {
            setLoading(false);
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
            if (errors) {
                const errorMessages = Object.entries(errors)
                    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
                    .join(' | ');
                setError(errorMessages);
            } else {
                setError('Erreur lors de la création du compte');
            }
        } finally {
            setLoading(false);
        }
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
                        </Tab>
                    </Tabs>
                </Card.Body>
            </Card>
        </div>
    );
};

export default Login;
