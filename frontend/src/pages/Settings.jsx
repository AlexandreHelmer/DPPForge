import React, { useState } from 'react';
import { Card, Form, Button, Row, Col, Alert } from 'react-bootstrap';
import { authService } from '../services/auth';
import { useNavigate } from 'react-router-dom';

const Settings = () => {
    const user = authService.getStoredUser();
    const navigate = useNavigate();

    const [passwordData, setPasswordData] = useState({
        old_password: '',
        new_password: '',
        confirm_password: '',
    });
    const [status, setStatus] = useState({ type: '', message: '' });
    const [loading, setLoading] = useState(false);

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwordData.new_password !== passwordData.confirm_password) {
            setStatus({ type: 'danger', message: 'Les nouveaux mots de passe ne correspondent pas' });
            return;
        }

        setLoading(true);
        setStatus({ type: '', message: '' });

        try {
            // Simplified: in a real app we'd have a specific endpoint for password change
            // For this demo, let's assume we use a general profile update or specific allauth endpoint
            // Since it's not implemented on backend yet, I'll just show the UI for now 
            // and explain we need a dedicated endpoint.
            setStatus({ type: 'info', message: 'Fonctionnalité en cours de développement sur le backend.' });
        } catch (err) {
            setStatus({ type: 'danger', message: 'Erreur lors du changement de mot de passe' });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (window.confirm('Voulez-vous vraiment supprimer votre compte ? Cette action est irréversible.')) {
            // Similarly, needs a backend endpoint
            alert('Pour supprimer votre compte, veuillez contacter le support admin@dpp.local');
        }
    };

    return (
        <div>
            <h1 className="mb-4">Paramètres de l'entreprise</h1>

            <Row>
                <Col md={6}>
                    <Card className="mb-4">
                        <Card.Header>Informations de Profil</Card.Header>
                        <Card.Body>
                            <Form>
                                <Form.Group className="mb-3">
                                    <Form.Label>Nom de l'entreprise</Form.Label>
                                    <Form.Control type="text" value={user?.company_name || ''} readOnly disabled />
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label>Email</Form.Label>
                                    <Form.Control type="email" value={user?.email || ''} readOnly disabled />
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label>Numéro SIREN/SIRET</Form.Label>
                                    <Form.Control type="text" value={user?.company_registration || ''} readOnly disabled />
                                </Form.Group>
                                <p className="text-muted small">Les informations de l'entreprise sont vérifiées et ne peuvent être modifiées qu'en contactant le support.</p>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>

                <Col md={6}>
                    <Card className="mb-4">
                        <Card.Header>Sécurité</Card.Header>
                        <Card.Body>
                            {status.message && <Alert variant={status.type}>{status.message}</Alert>}
                            <Form onSubmit={handlePasswordChange}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Ancien mot de passe</Form.Label>
                                    <Form.Control
                                        type="password"
                                        required
                                        value={passwordData.old_password}
                                        onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
                                    />
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label>Nouveau mot de passe</Form.Label>
                                    <Form.Control
                                        type="password"
                                        required
                                        value={passwordData.new_password}
                                        onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                                    />
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label>Confirmer le nouveau mot de passe</Form.Label>
                                    <Form.Control
                                        type="password"
                                        required
                                        value={passwordData.confirm_password}
                                        onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                                    />
                                </Form.Group>
                                <Button variant="primary" type="submit" disabled={loading}>
                                    Changer le mot de passe
                                </Button>
                            </Form>
                        </Card.Body>
                    </Card>

                    <Card border="danger">
                        <Card.Header className="bg-danger text-white">Zone de danger</Card.Header>
                        <Card.Body>
                            <p>La suppression de votre compte entrainera la suppression de tous vos produits, composants et instances de Digital Twins.</p>
                            <Button variant="danger" onClick={handleDeleteAccount}>
                                Supprimer mon compte entreprise
                            </Button>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default Settings;
