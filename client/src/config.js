// API configuration
// Use window.location.origin to automatically use the correct host
// This works both for localhost and network access (e.g., 192.168.1.88:3001)
const API_BASE_URL = import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:3001/api/v2`
    : window.location.origin + '/api/v2';

export default API_BASE_URL;
