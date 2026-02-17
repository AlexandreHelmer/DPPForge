import React from 'react';
import { Container } from 'react-bootstrap';

const Footer = () => {
    return (
        <footer className="footer mt-auto py-3">
            <Container>
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
                    <div className="text-secondary small">
                        © {new Date().getFullYear()} <span className="fw-bold">DPP•Forge</span>. Tous droits réservés.
                    </div>
                    <div className="small">
                        <a href="/legal/" target="_blank" rel="noopener noreferrer" className="text-secondary text-decoration-none hover-info">
                            Mentions Légales <i className="fas fa-external-link-alt ms-1 small"></i>
                        </a>
                    </div>
                </div>
            </Container>
        </footer>
    );
};

export default Footer;
