import React, { useState, useEffect } from 'react';
import { Card, Alert, Spinner } from 'react-bootstrap';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/auth';

const VerifyEmail = () => {
    const { key } = useParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('loading'); // loading, success, error
    const [message, setMessage] = useState('');

    useEffect(() => {
        const verifyEmail = async () => {
            if (!key) {
                setStatus('error');
                setMessage('Clé de vérification manquante');
                return;
            }

            try {
                await authService.verifyEmail(key);
                setStatus('success');
                setMessage('Votre email a été vérifié avec succès !');

                // Redirect to login after 3 seconds
                setTimeout(() => {
                    navigate('/auth/login?verified=true');
                }, 3000);
            } catch (err) {
                setStatus('error');
                setMessage(
                    err.response?.data?.detail ||
                    err.response?.data?.error ||
                    'Erreur lors de la vérification. Le lien est peut-être expiré.'
                );
            }
        };

        verifyEmail();
    }, [key, navigate]);

    return (
        <div className="auth-container">
            <Card className="auth-card">
                <Card.Body className="text-center">
                    <h2 className="mb-4">Vérification d'email</h2>

                    {status === 'loading' && (
                        <>
                            <Spinner animation="border" variant="primary" className="mb-3" />
                            <p>Vérification de votre email en cours...</p>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <Alert variant="success">{message}</Alert>
                            <p>Redirection vers la page de connexion...</p>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <Alert variant="danger">{message}</Alert>
                            <Link to="/auth/login" className="btn btn-primary">
                                Retour à la connexion
                            </Link>
                        </>
                    )}
                </Card.Body>
            </Card>
        </div>
    );
};

export default VerifyEmail;
