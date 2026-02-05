import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer className="footer mt-auto">
            <Container>
                <Row>
                    <Col md={4} className="mb-4 mb-md-0">
                        <h5 className="text-dark fw-bold mb-3">DPP Platform</h5>
                        <p>Solution de Passeport Numérique de Produit conforme aux normes européennes.</p>
                    </Col>
                    <Col md={4} className="mb-4 mb-md-0">
                        <h6 className="text-dark fw-bold mb-3">Plan du site</h6>
                        <ul className="list-unstyled">
                            <li><Link to="/dashboard" className="text-decoration-none text-secondary">Dashboard</Link></li>
                            <li><Link to="/products" className="text-decoration-none text-secondary">Mes Produits</Link></li>
                            <li><Link to="/components" className="text-decoration-none text-secondary">Composants</Link></li>
                        </ul>
                    </Col>
                    <Col md={4}>
                        <h6 className="text-dark fw-bold mb-3">Contact & Support</h6>
                        <ul className="list-unstyled">
                            <li>Email: support@dpp-manager.eu</li>
                            <li><Link to="/legal" className="text-decoration-none text-secondary">Mentions Légales</Link></li>
                        </ul>
                    </Col>
                </Row>
                <hr className="my-4" />
                <div className="d-flex justify-content-between align-items-center">
                    <p className="mb-0">© {new Date().getFullYear()} DPP Platform. Tous droits réservés.</p>
                    <p className="mb-0 text-muted small">v1.2.0 - Compliance (EU) 2023/1542</p>
                </div>
            </Container>
        </footer>
    );
};

export default Footer;
