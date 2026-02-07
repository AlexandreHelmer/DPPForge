import React from 'react';
import { Button } from 'react-bootstrap';
import { FaGoogle, FaMicrosoft, FaGithub } from 'react-icons/fa';
import { authService } from '../services/auth';

const SocialLoginButtons = ({ variant = 'outline-primary', className = '', onSuccess = null }) => {
    const handleSocialLogin = (provider) => {
        authService.openSocialPopup(provider, onSuccess);
    };

    const buttonStyle = {
        marginBottom: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px'
    };

    return (
        <div className={`d-grid gap-2 ${className}`}>
            <Button
                variant={variant}
                onClick={() => handleSocialLogin('google')}
                style={buttonStyle}
            >
                <FaGoogle size={20} /> Continuer avec Google
            </Button>
            <Button
                variant={variant}
                onClick={() => handleSocialLogin('microsoft')}
                style={buttonStyle}
            >
                <FaMicrosoft size={20} /> Continuer avec Microsoft
            </Button>
            <Button
                variant={variant}
                onClick={() => handleSocialLogin('github')}
                style={buttonStyle}
            >
                <FaGithub size={20} /> Continuer avec GitHub
            </Button>
        </div>
    );
};

export default SocialLoginButtons;
