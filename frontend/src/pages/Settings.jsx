import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Row, Col, Alert, Tabs, Tab, Badge, ListGroup, Spinner } from 'react-bootstrap';
import { FaGoogle, FaMicrosoft, FaGithub, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { authService } from '../services/auth';
import { productsService } from '../services/products';

const Settings = () => {
    const user = authService.getStoredUser();

    // Password change state
    const [passwordData, setPasswordData] = useState({
        old_password: '',
        new_password: '',
        confirm_password: '',
    });
    const [passwordStatus, setPasswordStatus] = useState({ type: '', message: '' });
    const [passwordLoading, setPasswordLoading] = useState(false);

    // Email change state
    const [newEmail, setNewEmail] = useState('');
    const [emailStatus, setEmailStatus] = useState({ type: '', message: '' });
    const [emailLoading, setEmailLoading] = useState(false);
    const [emailAddresses, setEmailAddresses] = useState([]);

    // Social accounts state
    const [socialAccounts, setSocialAccounts] = useState([]);
    const [socialLoading, setSocialLoading] = useState(false);
    const [socialStatus, setSocialStatus] = useState({ type: '', message: '' });

    // Delete account state
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Appearance state
    const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('theme') === 'dark');

    // Data export state
    const [exportLoading, setExportLoading] = useState(false);
    const [exportStatus, setExportStatus] = useState({ type: '', message: '' });

    const toggleTheme = () => {
        const newTheme = !isDarkMode ? 'dark' : 'light';
        setIsDarkMode(!isDarkMode);
        localStorage.setItem('theme', newTheme);
        window.dispatchEvent(new Event('themeChange'));
    };

    // Load email addresses and social accounts
    useEffect(() => {
        loadEmailAddresses();
        loadSocialAccounts();
    }, []);

    const loadEmailAddresses = async () => {
        try {
            const data = await authService.getEmailStatus();
            setEmailAddresses(data.emails || []);
        } catch (err) {
            console.error('Failed to load email addresses:', err);
        }
    };

    const loadSocialAccounts = async () => {
        try {
            const data = await authService.getSocialAccounts();
            setSocialAccounts(data || []);
        } catch (err) {
            console.error('Failed to load social accounts:', err);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwordData.new_password !== passwordData.confirm_password) {
            setPasswordStatus({ type: 'danger', message: 'Les nouveaux mots de passe ne correspondent pas' });
            return;
        }

        setPasswordLoading(true);
        setPasswordStatus({ type: '', message: '' });

        try {
            await authService.changePassword(
                passwordData.old_password,
                passwordData.new_password,
                passwordData.confirm_password
            );
            setPasswordStatus({ type: 'success', message: 'Mot de passe changé avec succès' });
            setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
        } catch (err) {
            let errorMsg = 'Erreur lors du changement de mot de passe';
            const data = err.response?.data;

            if (data) {
                if (typeof data === 'string') {
                    errorMsg = data;
                } else if (data.error) {
                    errorMsg = data.error;
                } else if (data.non_field_errors) {
                    errorMsg = data.non_field_errors.join(' ');
                } else if (data.old_password) {
                    errorMsg = `Ancien mot de passe : ${data.old_password.join(' ')}`;
                } else if (data.new_password1) {
                    errorMsg = `Nouveau mot de passe : ${data.new_password1.join(' ')}`;
                } else {
                    // Combine other field errors
                    const errors = Object.entries(data)
                        .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(' ') : val}`)
                        .join(' | ');
                    if (errors) errorMsg = errors;
                }
            }

            setPasswordStatus({ type: 'danger', message: errorMsg });
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleEmailChange = async (e) => {
        e.preventDefault();
        setEmailLoading(true);
        setEmailStatus({ type: '', message: '' });

        try {
            const result = await authService.changeEmail(newEmail);
            setEmailStatus({ type: 'success', message: result.message });
            setNewEmail('');
            loadEmailAddresses();
        } catch (err) {
            setEmailStatus({ type: 'danger', message: err.response?.data?.error || 'Erreur lors du changement d\'email' });
        } finally {
            setEmailLoading(false);
        }
    };

    const handleResendVerification = async (email) => {
        try {
            const result = await authService.resendVerification(email);
            setEmailStatus({ type: 'success', message: result.message });
        } catch (err) {
            setEmailStatus({ type: 'danger', message: 'Erreur lors de l\'envoi de vérification' });
        }
    };

    const handleMakePrimary = async (email) => {
        try {
            const result = await authService.makePrimaryEmail(email);
            setEmailStatus({ type: 'success', message: result.message });
            loadEmailAddresses();
            // Refresh user data
            await authService.getCurrentUser();
        } catch (err) {
            setEmailStatus({ type: 'danger', message: err.response?.data?.error || 'Erreur' });
        }
    };

    const handleDisconnectSocial = async (accountId, provider) => {
        if (!window.confirm(`Voulez-vous vraiment déconnecter votre compte ${provider} ?`)) {
            return;
        }

        setSocialLoading(true);
        setSocialStatus({ type: '', message: '' });

        try {
            const result = await authService.disconnectSocialAccount(accountId);
            setSocialStatus({ type: 'success', message: result.message });
            loadSocialAccounts();
        } catch (err) {
            setSocialStatus({ type: 'danger', message: err.response?.data?.error || 'Erreur lors de la déconnexion' });
        } finally {
            setSocialLoading(false);
        }
    };

    const handleConnectSocial = (provider) => {
        authService.openSocialPopup(provider, () => {
            loadSocialAccounts();
            setSocialStatus({ type: 'success', message: `Compte ${provider} connecté avec succès` });
        });
    };

    const handleDeleteAccount = async (e) => {
        e.preventDefault();
        setDeleteLoading(true);
        try {
            await authService.deleteAccount(deletePassword);
            // Redirect will happen after logout in authService
            window.location.href = '/app/login?deleted=true';
        } catch (err) {
            alert(err.response?.data?.error || 'Erreur lors de la suppression du compte');
        } finally {
            setDeleteLoading(false);
        }
    };

    const getProviderIcon = (provider) => {
        switch (provider) {
            case 'google': return <FaGoogle className="text-danger" />;
            case 'microsoft': return <FaMicrosoft className="text-primary" />;
            case 'github': return <FaGithub />;
            default: return null;
        }
    };

    const isProviderConnected = (provider) => {
        return socialAccounts.some(acc => acc.provider === provider);
    };

    const handleExportZip = async () => {
        setExportLoading(true);
        setExportStatus({ type: '', message: '' });
        try {
            await productsService.exportAllDataZip();
            setExportStatus({ type: 'success', message: 'Export téléchargé avec succès !' });
        } catch (err) {
            setExportStatus({ type: 'danger', message: 'Erreur lors de l\'export des données.' });
        } finally {
            setExportLoading(false);
        }
    };

    return (
        <div>
            <div className="page-header">
                <h1 className="mb-0">Paramètres du Compte</h1>
            </div>

            <Tabs defaultActiveKey="profile" id="settings-tabs" className="mb-3">
                {/* Profile Tab */}
                <Tab eventKey="profile" title="Profil">
                    <Card>
                        <Card.Header>Informations de l'Entreprise</Card.Header>
                        <Card.Body>
                            <Form>
                                <Form.Group className="mb-3">
                                    <Form.Label>Nom de l'entreprise</Form.Label>
                                    <Form.Control type="text" value={user?.company_name || ''} readOnly disabled />
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label>Email principal</Form.Label>
                                    <Form.Control type="email" value={user?.email || ''} readOnly disabled />
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label>Numéro SIREN/SIRET</Form.Label>
                                    <Form.Control type="text" value={user?.company_registration || ''} readOnly disabled />
                                </Form.Group>
                                <Alert variant="info" className="mb-0">
                                    Les informations de l'entreprise sont vérifiées et ne peuvent être modifiées qu'en contactant le support.
                                </Alert>
                            </Form>
                        </Card.Body>
                    </Card>
                </Tab>

                {/* Email Management Tab */}
                <Tab eventKey="email" title="Gestion des Emails">
                    <Row>
                        <Col md={6}>
                            <Card className="mb-3">
                                <Card.Header>Emails Associés</Card.Header>
                                <Card.Body>
                                    {emailAddresses.length > 0 ? (
                                        <ListGroup variant="flush">
                                            {emailAddresses.map((ea, idx) => (
                                                <ListGroup.Item key={idx} className="d-flex justify-content-between align-items-center">
                                                    <div>
                                                        <div>
                                                            {ea.email}
                                                            {ea.primary && <Badge bg="primary" className="ms-2">Principal</Badge>}
                                                        </div>
                                                        <small className="text-muted">
                                                            {ea.verified ? (
                                                                <span className="text-success">
                                                                    <FaCheckCircle /> Vérifié
                                                                </span>
                                                            ) : (
                                                                <span className="text-warning">
                                                                    <FaTimesCircle /> Non vérifié
                                                                </span>
                                                            )}
                                                        </small>
                                                    </div>
                                                    <div>
                                                        {!ea.verified && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline-primary"
                                                                onClick={() => handleResendVerification(ea.email)}
                                                            >
                                                                Renvoyer
                                                            </Button>
                                                        )}
                                                        {ea.verified && !ea.primary && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline-success"
                                                                onClick={() => handleMakePrimary(ea.email)}
                                                            >
                                                                Définir principal
                                                            </Button>
                                                        )}
                                                    </div>
                                                </ListGroup.Item>
                                            ))}
                                        </ListGroup>
                                    ) : (
                                        <p className="text-muted">Aucun email trouvé</p>
                                    )}
                                </Card.Body>
                            </Card>
                        </Col>

                        <Col md={6}>
                            <Card>
                                <Card.Header>Ajouter un Nouvel Email</Card.Header>
                                <Card.Body>
                                    {emailStatus.message && <Alert variant={emailStatus.type}>{emailStatus.message}</Alert>}
                                    <Form onSubmit={handleEmailChange}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Nouvel email</Form.Label>
                                            <Form.Control
                                                type="email"
                                                required
                                                value={newEmail}
                                                onChange={(e) => setNewEmail(e.target.value)}
                                                placeholder="nouveau@exemple.com"
                                            />
                                            <Form.Text className="text-muted">
                                                Un email de vérification sera envoyé à cette adresse
                                            </Form.Text>
                                        </Form.Group>
                                        <Button variant="primary" type="submit" disabled={emailLoading}>
                                            {emailLoading ? 'Envoi...' : 'Ajouter l\'email'}
                                        </Button>
                                    </Form>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </Tab>

                {/* Password Tab */}
                <Tab eventKey="password" title="Mot de Passe">
                    <Card>
                        <Card.Header>Changer le Mot de Passe</Card.Header>
                        <Card.Body>
                            {passwordStatus.message && <Alert variant={passwordStatus.type}>{passwordStatus.message}</Alert>}
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
                                <Button variant="primary" type="submit" disabled={passwordLoading}>
                                    {passwordLoading ? 'Changement...' : 'Changer le mot de passe'}
                                </Button>
                            </Form>
                        </Card.Body>
                    </Card>
                </Tab>

                {/* Social Accounts Tab */}
                <Tab eventKey="social" title="Comptes Associés">
                    <Card>
                        <Card.Header>Comptes Sociaux Connectés</Card.Header>
                        <Card.Body>
                            {socialStatus.message && <Alert variant={socialStatus.type}>{socialStatus.message}</Alert>}

                            <h5 className="mb-3">Comptes Connectés</h5>
                            {socialAccounts.length > 0 ? (
                                <ListGroup className="mb-4">
                                    {socialAccounts.map((account) => (
                                        <ListGroup.Item key={account.id} className="d-flex justify-content-between align-items-center">
                                            <div className="d-flex align-items-center gap-2">
                                                {getProviderIcon(account.provider)}
                                                <div>
                                                    <strong>{account.provider_name}</strong>
                                                    <br />
                                                    <small className="text-muted">
                                                        Connecté le {new Date(account.date_joined).toLocaleDateString()}
                                                    </small>
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="outline-danger"
                                                onClick={() => handleDisconnectSocial(account.id, account.provider_name)}
                                                disabled={socialLoading}
                                            >
                                                Déconnecter
                                            </Button>
                                        </ListGroup.Item>
                                    ))}
                                </ListGroup>
                            ) : (
                                <Alert variant="info" className="mb-4">
                                    Aucun compte social connecté
                                </Alert>
                            )}

                            <h5 className="mb-3">Connecter un Nouveau Compte</h5>
                            <div className="d-grid gap-2">
                                {!isProviderConnected('google') && (
                                    <Button
                                        variant="outline-danger"
                                        onClick={() => handleConnectSocial('google')}
                                        className="d-flex align-items-center justify-content-center gap-2"
                                    >
                                        <FaGoogle /> Connecter Google
                                    </Button>
                                )}
                                {!isProviderConnected('microsoft') && (
                                    <Button
                                        variant="outline-primary"
                                        onClick={() => handleConnectSocial('microsoft')}
                                        className="d-flex align-items-center justify-content-center gap-2"
                                    >
                                        <FaMicrosoft /> Connecter Microsoft
                                    </Button>
                                )}
                                {!isProviderConnected('github') && (
                                    <Button
                                        variant="outline-dark"
                                        onClick={() => handleConnectSocial('github')}
                                        className="d-flex align-items-center justify-content-center gap-2"
                                    >
                                        <FaGithub /> Connecter GitHub
                                    </Button>
                                )}
                            </div>
                        </Card.Body>
                    </Card>
                </Tab>

                {/* Social Accounts Tab */}
                <Tab eventKey="apparence" title="Apparence">
                    <Card>
                        <Card.Header>Personnalisation</Card.Header>
                        <Card.Body>
                            <h5 className="mb-3">Thème de l'interface</h5>
                            <p className="text-muted small">
                                Choisissez entre le mode clair et le mode sombre pour votre confort visuel.
                            </p>
                            <Form.Check
                                type="switch"
                                id="dark-mode-switch"
                                label={isDarkMode ? "Mode sombre activé" : "Mode sombre désactivé"}
                                checked={isDarkMode}
                                onChange={toggleTheme}
                                className="fs-5"
                            />
                            <div className="mt-4 p-3 bg-secondary-subtle rounded">
                                <p className="mb-0 small text-muted">
                                    <strong>Astuce :</strong> Le mode sombre réduit la fatigue oculaire dans les environnements peu éclairés.
                                </p>
                            </div>
                        </Card.Body>
                    </Card>
                </Tab>

                {/* Data Export Tab */}
                <Tab eventKey="data" title="Mes Données">
                    <Card>
                        <Card.Header>Exporter mes données</Card.Header>
                        <Card.Body>
                            {exportStatus.message && <Alert variant={exportStatus.type}>{exportStatus.message}</Alert>}

                            <h5 className="mb-3">Télécharger l'ensemble de mes données</h5>
                            <p className="text-muted small">
                                Exportez toutes vos données au format <strong>.zip</strong>. L'archive contient :
                            </p>
                            <ul className="text-muted small mb-4">
                                <li><strong>compte.json</strong> — Informations de votre entreprise</li>
                                <li><strong>composants.csv</strong> — Tous vos composants et matériaux</li>
                                <li><strong>produits.csv</strong> — L'intégralité de votre catalogue</li>
                                <li><strong>digital_twins.csv</strong> — Registre de vos Digital Twins</li>
                                <li><strong>liens_fournisseurs.csv</strong> — Historique des liens fournisseurs</li>
                            </ul>

                            <Button
                                variant="primary"
                                onClick={handleExportZip}
                                disabled={exportLoading}
                                className="d-flex align-items-center gap-2"
                            >
                                {exportLoading ? (
                                    <><Spinner size="sm" animation="border" /> Préparation de l'archive…</>
                                ) : (
                                    <><i className="fas fa-file-zipper"></i> Exporter toutes mes données (.zip)</>
                                )}
                            </Button>

                            <div className="mt-4 p-3 bg-secondary-subtle rounded">
                                <p className="mb-0 small text-muted">
                                    <strong>Droit à la portabilité :</strong> Conformément au RGPD, vous pouvez
                                    récupérer vos données dans un format structuré et lisible par machine.
                                    Les fichiers CSV sont compatibles avec Excel, Google Sheets, et tout tableur.
                                </p>
                            </div>
                        </Card.Body>
                    </Card>
                </Tab>

                {/* Danger Zone Tab */}
                <Tab eventKey="danger" title="Suppression du compte">
                    <Card border="danger">
                        <Card.Header className="bg-danger text-white">Supprimer mon compte</Card.Header>
                        <Card.Body>
                            <Alert variant="warning">
                                <h5>Attention : Action Irréversible</h5>
                                <p>
                                    La suppression de votre compte anonymisera vos données personnelles.
                                    Vous ne pourrez plus vous connecter ni accéder à votre tableau de bord.
                                </p>
                                <hr />
                                <p className="mb-0">
                                    <strong>Note :</strong> Conformément aux régulations EU DPP, les Passeports Numériques de Produits
                                    et Digital Twins que vous avez générés <strong>resteront accessibles</strong> publiquement pour garantir
                                    la traçabilité des produits déjà sur le marché.
                                </p>
                            </Alert>

                            {!showDeleteConfirm ? (
                                <Button
                                    variant="outline-danger"
                                    onClick={() => setShowDeleteConfirm(true)}
                                >
                                    Supprimer mon compte...
                                </Button>
                            ) : (
                                <Form onSubmit={handleDeleteAccount}>
                                    <p className="text-danger">
                                        Voulez-vous vraiment continuer ? Cette action est définitive.
                                    </p>

                                    {user?.has_password && (
                                        <Form.Group className="mb-3">
                                            <Form.Label>Veuillez entrer votre mot de passe pour confirmer :</Form.Label>
                                            <Form.Control
                                                type="password"
                                                required
                                                value={deletePassword}
                                                onChange={(e) => setDeletePassword(e.target.value)}
                                                placeholder="Mot de passe actuel"
                                            />
                                        </Form.Group>
                                    )}

                                    <div className="d-flex gap-2">
                                        <Button
                                            variant="danger"
                                            type="submit"
                                            disabled={deleteLoading}
                                        >
                                            {deleteLoading ? 'Suppression...' : 'Confirmer la suppression définitive'}
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            onClick={() => {
                                                setShowDeleteConfirm(false);
                                                setDeletePassword('');
                                            }}
                                            disabled={deleteLoading}
                                        >
                                            Annuler
                                        </Button>
                                    </div>
                                </Form>
                            )}
                        </Card.Body>
                    </Card>
                </Tab>
            </Tabs>
        </div>
    );
};

export default Settings;

