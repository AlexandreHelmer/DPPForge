import api from './api';

export const productsService = {
    // Components (Items with is_main_product=false)
    async getComponents() {
        const response = await api.get('/api/items/', { params: { is_main_product: false } });
        return response.data;
    },

    async getComponent(id) {
        const response = await api.get(`/api/items/${id}/`);
        return response.data;
    },

    async createComponent(data) {
        const response = await api.post('/api/items/', { ...data, is_main_product: false });
        return response.data;
    },

    async updateComponent(id, data) {
        const response = await api.put(`/api/items/${id}/`, data);
        return response.data;
    },

    async deleteComponent(id) {
        await api.delete(`/api/items/${id}/`);
    },

    async archiveComponent(id) {
        const response = await api.post(`/api/items/${id}/archive/`);
        return response.data;
    },

    async unarchiveComponent(id) {
        const response = await api.post(`/api/items/${id}/unarchive/`);
        return response.data;
    },

    // Products (Items with is_main_product=true)
    async getProducts() {
        const response = await api.get('/api/items/', { params: { is_main_product: true } });
        return response.data;
    },

    async getProduct(id) {
        const response = await api.get(`/api/items/${id}/`);
        return response.data;
    },

    async createProduct(data) {
        const response = await api.post('/api/items/', { ...data, is_main_product: true });
        return response.data;
    },

    async updateProduct(id, data) {
        const response = await api.put(`/api/items/${id}/`, data);
        return response.data;
    },

    async deleteProduct(id) {
        await api.delete(`/api/items/${id}/`);
    },

    async createSnapshot(data) {
        const response = await api.post('/api/snapshots/', data);
        return response.data;
    },

    async getSnapshots() {
        const response = await api.get('/api/snapshots/');
        return response.data;
    },

    // Digital Twins
    async getDigitalTwins() {
        const response = await api.get('/api/twins/');
        return response.data;
    },

    async batchCreateDigitalTwins(data) {
        const response = await api.post('/api/twins/batch_create/', data);
        return response.data;
    },

    async regenerateQR(id) {
        const response = await api.post(`/api/twins/${id}/regenerate_qr/`);
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

    // Supplier Links (authenticated - brand)
    async createSupplierLink(data) {
        const response = await api.post('/api/supplier-links/', data);
        return response.data;
    },

    async getSupplierLinks() {
        const response = await api.get('/api/supplier-links/');
        return response.data;
    },

    async revokeSupplierLink(id) {
        const response = await api.post(`/api/supplier-links/${id}/revoke/`);
        return response.data;
    },

    // Supplier Links (public - supplier)
    async getPublicSupplierLink(token) {
        const response = await api.get(`/api/public/supplier/${token}/`);
        return response.data;
    },

    async verifySupplierPassword(token, password) {
        const response = await api.post(`/api/public/supplier/${token}/verify-password/`, { password });
        return response.data;
    },

    async submitSupplierData(token, data) {
        const response = await api.post(`/api/public/supplier/${token}/submit/`, data);
        return response.data;
    },

    // ---------------------------------------------------------------
    // Export / Import
    // ---------------------------------------------------------------

    /** Download all user data as a .zip file */
    async exportAllDataZip() {
        const response = await api.get('/api/export/zip/', { responseType: 'blob' });
        const url = window.URL.createObjectURL(response.data);
        const link = document.createElement('a');
        link.href = url;
        // Extract filename from Content-Disposition header or use fallback
        const disposition = response.headers['content-disposition'];
        const filename = disposition
            ? disposition.split('filename="')[1]?.replace('"', '') || 'dppforge_export.zip'
            : 'dppforge_export.zip';
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },

    /** Download a CSV export for a given entity */
    async exportCsv(entityPath) {
        const response = await api.get(`/api/export/${entityPath}/csv/`, { responseType: 'blob' });
        const url = window.URL.createObjectURL(response.data);
        const link = document.createElement('a');
        link.href = url;
        const disposition = response.headers['content-disposition'];
        const filename = disposition
            ? disposition.split('filename="')[1]?.replace('"', '') || `${entityPath}.csv`
            : `${entityPath}.csv`;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },

    /** Upload a CSV file to import data for a given entity */
    async importCsv(entityPath, file) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post(`/api/import/${entityPath}/csv/`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },
};

export default productsService;

