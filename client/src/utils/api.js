export const authHeaders = (extra = {}) => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    ...extra
});
