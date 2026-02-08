import React from 'react';
import { Button } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';

const Navbar = () => {
    const user = authService.getStoredUser();
    const navigate = useNavigate();
    const isAuthenticated = authService.isAuthenticated();

    const handleLogout = () => {
        authService.logout();
        navigate('/login');
    };

    if (!isAuthenticated) return null;

    return (
        <header className="top-navbar d-flex justify-content-between align-items-center" role="banner">
            <div className="d-flex align-items-center">
                <h5 className="mb-0 text-muted small text-uppercase fw-bold tracking-wider">Plateforme DPP</h5>
            </div>

            <div className="d-flex align-items-center">
                <div className="me-3 text-end d-none d-md-block">
                    <div className="fw-bold small">{user?.company_name}</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>{user?.email}</div>
                </div>
                <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={handleLogout}
                    className="border-0"
                    aria-label="Se déconnecter"
                >
                    <i className="fas fa-right-from-bracket"></i>
                </Button>
            </div>
        </header>
    );
};

export default Navbar;
