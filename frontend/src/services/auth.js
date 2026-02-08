import api from './api';

export const authService = {
    // Login with dj-rest-auth
    async login(email, password) {
        const response = await api.post('/api/auth/login/', { email, password });
        if (response.data.key) {
            localStorage.setItem('authToken', response.data.key);
            if (response.data.user) {
                localStorage.setItem('user', JSON.stringify(response.data.user));
            }
            return response.data;
        }
        throw new Error('No token received');
    },

    // Register with dj-rest-auth
    async register(email, company_name, password1, password2, company_registration = '') {
        const response = await api.post('/api/auth/registration/', {
            email,
            company_name,
            password1,
            password2,
            company_registration,
        });
        return response.data;
    },

    // Logout
    async logout() {
        try {
            await api.post('/api/auth/logout/');
        } finally {
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
        }
    },

    // Get current user
    async getCurrentUser() {
        const response = await api.get('/api/auth/user/');
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

    // Change password
    async changePassword(old_password, new_password1, new_password2) {
        const response = await api.post('/api/auth/password/change/', {
            old_password,
            new_password1,
            new_password2
        });
        return response.data;
    },

    // Request password reset
    async requestPasswordReset(email) {
        const response = await api.post('/api/auth/password/reset/', { email });
        return response.data;
    },

    // Confirm password reset
    async confirmPasswordReset(key, new_password1, new_password2) {
        // Allauth 'key' is 'uid-timestamp-hash' (e.g. uid-ts-hash)
        // We split at the first dash: the first part is UID, the rest is the Token
        const firstDashIndex = key.indexOf('-');
        const uid = key.substring(0, firstDashIndex);
        const token = key.substring(firstDashIndex + 1);

        const response = await api.post('/api/auth/password/reset/confirm/', {
            uid,
            token,
            new_password1,
            new_password2
        });
        return response.data;
    },

    // Verify email
    async verifyEmail(key) {
        const response = await api.post('/api/auth/registration/verify-email/', { key });
        return response.data;
    },

    // Resend verification email
    async resendVerification(email) {
        const response = await api.post('/api/auth/social/emails/resend/', { email });
        return response.data;
    },

    // Get connected social accounts
    async getSocialAccounts() {
        const response = await api.get('/api/auth/social/accounts/');
        return response.data;
    },

    // Disconnect a social account
    async disconnectSocialAccount(accountId) {
        const response = await api.post(`/api/auth/social/accounts/${accountId}/disconnect/`);
        return response.data;
    },

    // Get social login URL
    getSocialLoginUrl(provider) {
        return `${window.location.protocol}//${window.location.hostname}:8000/accounts/${provider}/login/`;
    },

    // Unified popup logic for social login
    openSocialPopup(provider, onSuccess = null) {
        const socialUrl = this.getSocialLoginUrl(provider);

        // Calculate centered popup position
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        // Open OAuth in popup
        const popup = window.open(
            socialUrl,
            'oauth_popup',
            `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes`
        );

        // Poll to check if popup closed
        const pollTimer = setInterval(() => {
            if (popup && popup.closed) {
                clearInterval(pollTimer);

                // Check if user is now authenticated
                if (this.isAuthenticated()) {
                    // Refresh user data
                    this.getCurrentUser().then(() => {
                        if (onSuccess) {
                            onSuccess();
                        } else {
                            // Default: reload current page to reflect changes
                            window.location.reload();
                        }
                    });
                }
            }
        }, 500);

        return popup;
    },

    // Delete account
    async deleteAccount(password = null) {
        const response = await api.post('/api/auth/social/delete-account/', { password });
        this.logout();
        return response.data;
    },

    // Get all emails associated with account
    async getEmailStatus() {
        const response = await api.get('/api/auth/social/emails/');
        return response.data;
    },

    // Add a new email address
    async changeEmail(email) {
        const response = await api.post('/api/auth/social/emails/', { email });
        return response.data;
    },

    // Set an email as primary
    async makePrimaryEmail(email) {
        const response = await api.post('/api/auth/social/emails/primary/', { email });
        return response.data;
    }
};

export default authService;
