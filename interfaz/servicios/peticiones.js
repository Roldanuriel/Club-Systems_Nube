import { authService } from './autenticacion';
function normalizeApiErrorMessage(data) {
  const detailsArray = Array.isArray(data?.details) ? data.details.filter(Boolean) : [];
  const detailsString = typeof data?.details === 'string' ? data.details.trim() : '';
  const baseMsg = (data?.statusMessage || data?.message || data?.error || '').toString().trim();
  if (detailsArray.length) return detailsArray.join('. ');
  if (detailsString) return detailsString;
  if (/^validaci[oó]n$/i.test(baseMsg)) {
    return 'Los datos enviados no son válidos. Verifica texto, números y caracteres permitidos.';
  }
  return baseMsg || 'Error en la petición';
}
function getAuthHeaders() {
  const headers = {};
  const token = authService.getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}
async function handleAuthError(response) {
  if (response.status === 401) {
    try {
      await authService.refreshToken();
      return true;
    } catch (e) {
      authService.clearAuth();
      if (typeof window !== 'undefined' && window.location) {
        const currentPath = window.location.pathname || window.location.hash || '';
        if (currentPath.includes('oficina') || currentPath.includes('monitor')) {
          window.location.href = '/';
        }
      }
      return false;
    }
  }
  return true;
}
export async function request(url, options = {}) {
  const finalOptions = {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers
    }
  };
  let res = await fetch(url, finalOptions);
  if (res.status === 401) {
    const retrySuccess = await handleAuthError(res);
    if (retrySuccess && authService.getToken()) {
      finalOptions.headers = {
        ...getAuthHeaders(),
        ...options.headers
      };
      res = await fetch(url, finalOptions);
    }
  }
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = {
      raw: text
    };
  }
  const finalMsg = normalizeApiErrorMessage(data);
  if (!res.ok || data?.status === 'error') {
    throw new Error(finalMsg);
  }
  return data;
}
