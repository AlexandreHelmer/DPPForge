import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Badge, Alert } from 'react-bootstrap';
import { productsService } from '../services/products';
import ListTable from '../components/ListTable';

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const data = await productsService.getDashboardStats();
            setStats(data);
        } catch (err) {
            setError('Erreur lors du chargement des statistiques');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            DRAFT: { bg: 'secondary', text: 'Brouillon' },
            COMPLETE: { bg: 'success', text: 'Complet' },
            LOCKED: { bg: 'primary', text: 'Verrouillé' },
        };
        const badge = badges[status] || { bg: 'secondary', text: status };
        return <Badge bg={badge.bg}>{badge.text}</Badge>;
    };

    if (loading) return <div className="text-center p-5">Analyse des données en cours...</div>;
    if (error) return <Alert variant="danger">{error}</Alert>;
    if (!stats) return null;

    const recentProductsColumns = [
        { header: 'Produit', key: 'name', className: 'fw-bold' },
        { header: 'GTIN', key: 'gtin', render: (val) => <code>{val || '-'}</code> },
        { header: 'Statut', key: 'status', render: (val) => getStatusBadge(val) },
        {
            header: 'Créé le',
            key: 'created_at',
            render: (val) => new Date(val).toLocaleDateString('fr-FR')
        }
    ];

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <h1 className="mb-0">Tableau de Bord</h1>
            </div>

            {/* Summary Cards */}
            <Row className="mb-5 g-4">
                <Col md={3}>
                    <Card className="text-center h-100 shadow-sm border-0 stat-card">
                        <Card.Body className="d-flex flex-column justify-content-center py-4">
                            <div className="display-6 text-primary mb-2 opacity-75">
                                <i className="fas fa-box"></i>
                            </div>
                            <h3 className="fw-bold">{stats.summary.total_products}</h3>
                            <Card.Text className="text-muted small text-uppercase tracking-wider">Produits Totaux</Card.Text>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="text-center h-100 shadow-sm border-0 stat-card">
                        <Card.Body className="d-flex flex-column justify-content-center py-4">
                            <div className="display-6 text-accent mb-2 opacity-75">
                                <i className="fas fa-microchip"></i>
                            </div>
                            <h3 className="fw-bold">{stats.summary.total_components}</h3>
                            <Card.Text className="text-muted small text-uppercase tracking-wider">Matériaux</Card.Text>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="text-center h-100 shadow-sm border-0 border-bottom border-primary border-4 stat-card">
                        <Card.Body className="d-flex flex-column justify-content-center py-4">
                            <div className="display-6 text-info mb-2 opacity-75">
                                <i className="fas fa-qrcode"></i>
                            </div>
                            <h3 className="fw-bold">{stats.summary.total_instances}</h3>
                            <Card.Text className="text-muted small text-uppercase tracking-wider">Digital Twins</Card.Text>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="text-center h-100 shadow-sm bg-success text-white border-0 stat-card">
                        <Card.Body className="d-flex flex-column justify-content-center py-4">
                            <div className="display-6 mb-2 opacity-75">
                                <i className="fas fa-check-double"></i>
                            </div>
                            <h3 className="fw-bold">{stats.summary.complete_products}</h3>
                            <Card.Text className="small text-uppercase tracking-wider">DPP Prêts</Card.Text>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Row className="mb-5 g-4">
                <Col lg={6}>
                    <Card className="border-0 shadow-sm h-100">
                        <Card.Header className="bg-white py-3 fw-bold border-bottom-0">Répartition par Statut</Card.Header>
                        <Card.Body className="pt-0">
                            <div className="status-item d-flex justify-content-between align-items-center mb-3 p-3 bg-light rounded">
                                <span><i className="fas fa-file-pen me-2 text-muted"></i> Brouillon</span>
                                <Badge bg="secondary" className="px-3">{stats.products_by_status.draft}</Badge>
                            </div>
                            <div className="status-item d-flex justify-content-between align-items-center mb-3 p-3 bg-light rounded">
                                <span><i className="fas fa-circle-check me-2 text-success"></i> Complet</span>
                                <Badge bg="success" className="px-3">{stats.products_by_status.complete}</Badge>
                            </div>
                            <div className="status-item d-flex justify-content-between align-items-center p-3 bg-light rounded">
                                <span><i className="fas fa-lock me-2 text-primary"></i> Verrouillé (DPP)</span>
                                <Badge bg="primary" className="px-3">{stats.products_by_status.locked}</Badge>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col lg={6}>
                    <Card className="border-0 shadow-sm h-100">
                        <Card.Header className="bg-white py-3 fw-bold border-bottom-0">Performance Digital Twins</Card.Header>
                        <Card.Body className="pt-0">
                            <div className="d-flex justify-content-around text-center mt-3">
                                <div>
                                    <div className="text-muted small text-uppercase">Aujourd'hui</div>
                                    <h2 className="fw-bold text-accent">{stats.qr_codes.today}</h2>
                                </div>
                                <div className="border-start opacity-25"></div>
                                <div>
                                    <div className="text-muted small text-uppercase">Ce mois</div>
                                    <h2 className="fw-bold text-accent">{stats.qr_codes.this_month}</h2>
                                </div>
                                <div className="border-start opacity-25"></div>
                                <div>
                                    <div className="text-muted small text-uppercase">Total cumulé</div>
                                    <h2 className="fw-bold text-primary">{stats.qr_codes.total}</h2>
                                </div>
                            </div>
                            <div className="mt-4 p-3 bg-info bg-opacity-10 rounded text-center small text-info">
                                <i className="fas fa-info-circle me-1"></i> Les Digital Twins sont les exemplaires uniques de vos produits mis sur le marché.
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <div className="d-flex justify-content-between align-items-center mb-3">
                <h2 className="h4 mb-0 fw-bold">Modèles Récents</h2>
            </div>

            <ListTable
                items={stats.recent_products}
                columns={recentProductsColumns}
                pageSize={5}
                searchPlaceholder="Filtre rapide..."
                emptyMessage="Aucun modèle de produit créé pour le moment."
            />
        </div>
    );
};

export default Dashboard;
