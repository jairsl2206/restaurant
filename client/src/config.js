// API configuration
// In development, Vite proxies /api and /uploads to the backend (see vite.config.js).
// In production, requests go to the same origin as the frontend.
const API_BASE_URL = import.meta.env.DEV
    ? '/api'
    : window.location.origin + '/api';

export default API_BASE_URL;
