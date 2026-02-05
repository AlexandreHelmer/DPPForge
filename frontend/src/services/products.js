import api from './api';

export const productsService = {
    // Components
    async getComponents() {
        const response = await api.get('/api/components/');
        return response.data;
    },

    async getComponent(id) {
        const response = await api.get(`/api/components/${id}/`);
        return response.data;
    },

    async createComponent(data) {
        const response = await api.post('/api/components/', data);
        return response.data;
    },

    async updateComponent(id, data) {
        const response = await api.put(`/api/components/${id}/`, data);
        return response.data;
    },

    async deleteComponent(id) {
        await api.delete(`/api/components/${id}/`);
    },

    // Products
    async getProducts() {
        const response = await api.get('/api/products/');
        return response.data;
    },

    async getProduct(id) {
        const response = await api.get(`/api/products/${id}/`);
        return response.data;
    },

    async createProduct(data) {
        const response = await api.post('/api/products/', data);
        return response.data;
    },

    async updateProduct(id, data) {
        const response = await api.put(`/api/products/${id}/`, data);
        return response.data;
    },

    async deleteProduct(id) {
        await api.delete(`/api/products/${id}/`);
    },

    async generateJsonLd(id) {
        const response = await api.post(`/api/products/${id}/generate_json_ld/`);
        return response.data;
    },

    async lockProduct(id) {
        const response = await api.post(`/api/products/${id}/lock/`);
        return response.data;
    },

    async archiveProduct(id) {
        const response = await api.post(`/api/products/${id}/archive/`);
        return response.data;
    },

    async unarchiveProduct(id) {
        const response = await api.post(`/api/products/${id}/unarchive/`);
        return response.data;
    },

    // Digital Twins
    async getDigitalTwins() {
        const response = await api.get('/api/product-instances/');
        return response.data;
    },

    async batchCreateDigitalTwins(data) {
        const response = await api.post('/api/product-instances/batch_create/', data);
        return response.data;
    },

    async regenerateQR(id) {
        const response = await api.post(`/api/product-instances/${id}/regenerate_qr/`);
        return response.data;
    },

    // Public twin
    async getPublicTwin(id) {
        const response = await api.get(`/api/public/twins/${id}/`);
        return response.data;
    },

    // Dashboard
    async getDashboardStats() {
        const response = await api.get('/api/dashboard/stats/');
        return response.data;
    },
};

export default productsService;
