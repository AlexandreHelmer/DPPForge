import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests
api.interceptors.request.use(
    (config) => {
        // Don't add token for login/signup/resend-verification
        const isPublicEndpont = config.url.includes('/login/') ||
            config.url.includes('/signup/') ||
            config.url.includes('/resend-verification/');

        const token = localStorage.getItem('authToken');
        if (token && !isPublicEndpont) {
            config.headers.Authorization = `Token ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Handle response errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Unauthorized - clear token
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');

            // We don't force a redirect here anymore to avoid page reloads
            // The App.js poll or PrivateRoute will handle it gracefully
        }
        return Promise.reject(error);
    }
);

export default api;
