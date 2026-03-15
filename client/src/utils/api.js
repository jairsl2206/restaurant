export const authHeaders = (extra = {}) => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    ...extra
});

export const apiFetch = async (url, options = {}) => {
    const { json = true, auth = true, headers: extraHeaders = {}, ...rest } = options;
    const headers = auth ? authHeaders(extraHeaders) : extraHeaders;
    const response = await fetch(url, { ...rest, headers });
    if (json) return response.json();
    return response;
};

export const apiGet    = (url, opts = {})        => apiFetch(url, { method: 'GET',    ...opts });
export const apiPost   = (url, body, opts = {})  => apiFetch(url, { method: 'POST',   headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), ...opts });
export const apiPut    = (url, body, opts = {})  => apiFetch(url, { method: 'PUT',    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), ...opts });
export const apiDelete = (url, opts = {})        => apiFetch(url, { method: 'DELETE', ...opts });
