import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Alert, Badge, Table, Container, Row, Col } from 'react-bootstrap';
import { productsService } from '../services/products';

const PublicProductView = () => {
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadProductData();
    }, [id]);

    const loadProductData = async () => {
        try {
            const result = await productsService.getPublicTwin(id);
            setData(result);
        } catch (err) {
            setError(err.response?.data?.error || 'Ce passeport produit n\'est plus disponible ou l\'identifiant est incorrect.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
                <div className="text-center">
                    <div className="spinner-border text-primary mb-3" role="status"></div>
                    <p className="text-muted">Authentification du Passeport Numérique...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <Container className="mt-5">
                <Alert variant="warning" className="border-0 shadow-sm p-4">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    {error}
                </Alert>
            </Container>
        );
    }

    if (!data) return null;

    const { product_data, serial_number, created_at } = data;
    const creationDate = new Date(created_at);

    return (
        <Container className="py-5 animate-fade-in pb-5">
            <div className="text-center mb-5">
                <Badge bg="dark" className="px-3 py-2 mb-3 tracking-widest text-uppercase">
                    <i className="fas fa-shield-halved me-2"></i> Digital Product Passport
                </Badge>
                <h1 className="display-5 fw-bold">{product_data.name}</h1>
                <p className="lead text-muted">{product_data.brand} &bull; {product_data.category}</p>
            </div>

            <Row className="g-4">
                <Col lg={7}>
                    <Card className="border-0 shadow-sm mb-4 h-100 p-3">
                        <Card.Header className="bg-white border-0 py-3 d-flex justify-content-between align-items-center">
                            <h5 className="mb-0 fw-bold">Spécifications du Modèle</h5>
                            <i className="fas fa-info-circle text-muted"></i>
                        </Card.Header>
                        <Card.Body>
                            <Table borderless responsive className="mb-0">
                                <tbody>
                                    <tr className="border-bottom border-light">
                                        <th className="py-3 text-muted small text-uppercase" style={{ width: '40%' }}>GTIN (EAN/UPC)</th>
                                        <td className="py-3 fw-bold">{product_data.gtin}</td>
                                    </tr>
                                    <tr className="border-bottom border-light">
                                        <th className="py-3 text-muted small text-uppercase">N° Modèle</th>
                                        <td className="py-3">{product_data.model || '-'}</td>
                                    </tr>
                                    <tr className="border-bottom border-light">
                                        <th className="py-3 text-muted small text-uppercase">Fabricant responsable</th>
                                        <td className="py-3">{product_data.manufacturer}</td>
                                    </tr>
                                    <tr>
                                        <th className="py-3 text-muted small text-uppercase align-top">Description</th>
                                        <td className="py-3 text-muted">{product_data.description}</td>
                                    </tr>
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Col>

                <Col lg={5}>
                    <Card className="border-0 shadow-sm bg-primary text-white h-100 p-3">
                        <Card.Header className="bg-transparent border-0 py-3">
                            <h5 className="mb-0 fw-bold">Identité Digital Twin</h5>
                        </Card.Header>
                        <Card.Body>
                            <div className="mb-4">
                                <label className="small text-uppercase opacity-75 d-block mb-1">Numéro de Série Unique</label>
                                <div className="h3 fw-mono">{serial_number}</div>
                            </div>

                            <hr className="opacity-25" />

                            <div className="row mt-4">
                                <div className="col-6 border-end border-white border-opacity-25">
                                    <label className="small text-uppercase opacity-75 d-block mb-1">Date de production</label>
                                    <div className="fw-bold">{creationDate.toLocaleDateString('fr-FR')}</div>
                                </div>
                                <div className="col-6 ps-4">
                                    <label className="small text-uppercase opacity-75 d-block mb-1">Heure locale</label>
                                    <div className="fw-bold">{creationDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                                </div>
                            </div>

                            <div className="mt-5 p-3 bg-white bg-opacity-10 rounded">
                                <small className="d-block mb-2">
                                    <i className="fas fa-fingerprint me-2"></i>
                                    Authenticité garantie sur la plateforme DPP
                                </small>
                                <div className="fw-bold" style={{ fontSize: '0.7rem' }}>UID: {data.id}</div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Card className="mt-5 border-0 shadow-sm p-3">
                <Card.Header className="bg-white border-0 py-3">
                    <h5 className="mb-0 fw-bold">Composition & Matériaux</h5>
                </Card.Header>
                <Card.Body>
                    {product_data.components && product_data.components.length > 0 ? (
                        <Table responsive hover className="mt-2">
                            <thead className="table-light">
                                <tr>
                                    <th className="py-3">Désignation</th>
                                    <th className="py-3 text-center">Origine</th>
                                    <th className="py-3 text-end">Certifications</th>
                                </tr>
                            </thead>
                            <tbody>
                                {product_data.components.map((comp) => (
                                    <tr key={comp.id}>
                                        <td className="py-3">
                                            <div className="fw-bold">{comp.name}</div>
                                            <div className="small text-muted">{comp.manufacturer}</div>
                                        </td>
                                        <td className="py-3 text-center align-middle">
                                            <Badge bg="light" className="text-dark border">{comp.origin_country || 'NC'}</Badge>
                                        </td>
                                        <td className="py-3 text-end align-middle">
                                            <span className="badge rounded-pill bg-success bg-opacity-10 text-success p-2">Conforme</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    ) : (
                        <p className="text-center py-4 text-muted italic">Aucun détail de composant rendu public pour ce modèle.</p>
                    )}
                </Card.Body>
            </Card>

            <Card className="mt-5 border-0 shadow-sm bg-light">
                <Card.Header className="bg-transparent border-0 py-3 d-flex align-items-center">
                    <h5 className="mb-0 fw-bold">Données Structurées JSON-LD</h5>
                    <Badge bg="success" className="ms-3">Format Européen</Badge>
                </Card.Header>
                <Card.Body>
                    <p className="small text-muted mb-3">Ces données sont lisibles par les systèmes automatisés pour assurer l'interopérabilité au sein du marché unique européen.</p>
                    <pre className="p-4 bg-dark text-success rounded shadow-inner" style={{ fontSize: '0.8rem', maxHeight: '300px', overflowY: 'auto' }}>
                        {JSON.stringify(product_data.json_ld, null, 2)}
                    </pre>
                </Card.Body>
            </Card>

            <footer className="mt-5 text-center text-muted small">
                © {new Date().getFullYear()} DPP Manager Platform &bull; Passeport Numérique du Produit
            </footer>
        </Container>
    );
};

export default PublicProductView;
