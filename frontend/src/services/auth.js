import api from './api';

export const authService = {
    // Login
    async login(email, password) {
        const response = await api.post('/api/login/', { email, password });
        if (response.data.token) {
            localStorage.setItem('authToken', response.data.token);
            if (response.data.user) {
                localStorage.setItem('user', JSON.stringify(response.data.user));
            }
            return response.data;
        }
        throw new Error('No token received');
    },

    // Register
    async register(email, company_name, password1, password2) {
        const response = await api.post('/accounts/signup/', {
            email,
            company_name,
            password1,
            password2,
        });
        return response.data;
    },

    // Logout
    async logout() {
        try {
            // Optional: call backend to delete token
            // await api.post('/api/logout/'); 
        } finally {
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
        }
    },

    // Get current user
    async getCurrentUser() {
        const response = await api.get('/api/login/user/');
        localStorage.setItem('user', JSON.stringify(response.data));
        return response.data;
    },

    // Check if user is authenticated
    isAuthenticated() {
        return !!localStorage.getItem('authToken');
    },

    // Get stored user
    getStoredUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },
};

export default authService;
