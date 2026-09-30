import axios from 'axios';
import { BACKEND } from './direccion-servidor';
import { authService } from './autenticacion';
const api = axios.create({
  baseURL: BACKEND,
  headers: {
    'Content-Type': 'application/json'
  }
});
api.interceptors.request.use(config => {
  const token = authService.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const csrfToken = authService.getCsrfToken();
  if (csrfToken && config.method !== 'get') {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
}, error => {
  return Promise.reject(error);
});
api.interceptors.response.use(response => {
  if (response.headers['x-token-refreshed']) {
    const newToken = response.headers['x-token-refreshed'];
    authService.setToken(newToken);
  }
  if (response.data?.new_token) {
    authService.setToken(response.data.new_token);
  }
  return response;
}, async error => {
  const originalRequest = error.config;
  if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
    originalRequest._retry = true;
    try {
      const newToken = await authService.refreshToken();
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      authService.clearAuth();
      if (typeof window !== 'undefined' && window.location) {
        const currentPath = window.location.pathname || window.location.hash;
        if (currentPath.includes('oficina') || currentPath.includes('monitor')) {
          window.location.href = '/';
        }
      }
      return Promise.reject(refreshError);
    }
  }
  return Promise.reject(error);
});
export default api;
