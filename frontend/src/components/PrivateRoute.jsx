import React from 'react';
import { Navigate } from 'react-router-dom';
import { authService } from '../services/auth';

/**
 * PrivateRoute component that requires authentication
 */
const PrivateRoute = ({ children }) => {
    const isAuthenticated = authService.isAuthenticated();

    if (!isAuthenticated) {
        return <Navigate to="/auth/login" replace />;
    }

    return children;
};

export default PrivateRoute;
