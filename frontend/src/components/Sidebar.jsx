import React from 'react';
import { Nav, Button } from 'react-bootstrap';
import { NavLink, Link } from 'react-router-dom';

const Sidebar = ({ isCollapsed, onToggle, isMobileOpen, onCloseMobile }) => {
    return (
        <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-show' : ''}`} aria-label="Navigation principale">
            <div className="d-flex justify-content-between align-items-center mb-5 px-3 sidebar-brand">
                <Link to="/" className="text-white text-decoration-none h4 fw-bold mb-0" onClick={onCloseMobile}>
                    <i className="fas fa-cube me-2"></i>
                    <span>DPP Manager</span>
                </Link>
                <Button
                    variant="link"
                    className="p-0 text-white d-lg-none border-0"
                    onClick={onCloseMobile}
                    aria-label="Fermer le menu"
                >
                    <i className="fas fa-times fa-lg"></i>
                </Button>
            </div>

            <Nav className="flex-column" as="nav">
                <Nav.Link as={NavLink} to="/dashboard" title="Tableau de bord" onClick={onCloseMobile}>
                    <i className="fas fa-chart-line fw-fixed"></i>
                    <span>Tableau de bord</span>
                </Nav.Link>
                <Nav.Link as={NavLink} to="/components" title="Composants" onClick={onCloseMobile}>
                    <i className="fas fa-microchip fw-fixed"></i>
                    <span>Composants</span>
                </Nav.Link>
                <Nav.Link as={NavLink} to="/products" title="Produits" onClick={onCloseMobile}>
                    <i className="fas fa-box fw-fixed"></i>
                    <span>Produits</span>
                </Nav.Link>
                <Nav.Link as={NavLink} to="/qr-generator" title="Digital Twins" onClick={onCloseMobile}>
                    <i className="fas fa-qrcode fw-fixed"></i>
                    <span>Digital Twins</span>
                </Nav.Link>
                <Nav.Link as={NavLink} to="/supplier-links" title="Liens Fournisseurs" onClick={onCloseMobile}>
                    <i className="fas fa-link fw-fixed"></i>
                    <span>Liens Fournisseurs</span>
                </Nav.Link>

                <div className="mt-auto">
                    <Nav.Link as={NavLink} to="/settings" title="Paramètres" onClick={onCloseMobile}>
                        <i className="fas fa-user-gear fw-fixed"></i>
                        <span>Paramètres</span>
                    </Nav.Link>

                    <Button
                        variant="link"
                        className="nav-link w-100 border-0 text-start"
                        onClick={onToggle}
                        aria-label={isCollapsed ? "Développer le menu" : "Réduire le menu"}
                    >
                        <i className={`fas ${isCollapsed ? 'fa-angle-right' : 'fa-angle-left'} fw-fixed`}></i>
                        <span>Réduire le menu</span>
                    </Button>
                </div>
            </Nav>
        </aside>
    );
};

export default Sidebar;
