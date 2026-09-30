import axios from 'axios';
import { BACKEND } from './direccion-servidor';
const STORAGE_KEYS = {
  TOKEN: 'auth_token',
  REFRESH_TOKEN: 'auth_refresh_token',
  CSRF_TOKEN: 'csrf_token',
  USER_ID: 'usuarioId',
  USER_DATA: 'auth_user_data',
  TOKEN_EXPIRES_AT: 'token_expires_at'
};
let currentToken = null;
let pendingRefresh = null;
const isBrowser = () => typeof window !== 'undefined' && typeof sessionStorage !== 'undefined';

async function renewSession() {
  try {
    const response = await axios.post(`${BACKEND}/auth/refresh`, {
      refresh_token: authService.getRefreshToken()
    }, {
      headers: { Authorization: `Bearer ${authService.getToken()}` }
    });
    const session = response.data;
    if (session.status !== 'success') {
      throw new Error(session.message || 'Error al renovar token');
    }
    authService.setToken(session.token);
    if (session.csrf_token) authService.setCsrfToken(session.csrf_token);
    if (session.token_expires_at) authService.setTokenExpiry(session.token_expires_at);
    if (session.remember_token) authService.setRefreshToken(session.remember_token);
    return session.token;
  } catch (error) {
    authService.clearAuth();
    throw error;
  }
}

export const authService = {
  login: async credentials => {
    const response = await axios.post(`${BACKEND}/auth/login`, credentials);
    if (response.data.status === 'success') {
      const {
        token,
        csrf_token,
        remember_token,
        token_expires_at,
        ...userData
      } = response.data;
      authService.setToken(token);
      authService.setCsrfToken(csrf_token);
      authService.setUserData(userData);
      if (remember_token) {
        authService.setRefreshToken(remember_token);
      }
      if (token_expires_at) {
        authService.setTokenExpiry(token_expires_at);
      }
      return response.data;
    }
    throw new Error(response.data.message || 'Error al iniciar sesión');
  },
  logout: async (mode = 'current') => {
    const token = authService.getToken();
    if (token) {
      try {
        await axios.post(`${BACKEND}/auth/logout`, {
          mode,
          remember_token: authService.getRefreshToken()
        }, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (e) {
        // Silencioso en producción - error no crítico
      }
    }
    authService.clearAuth();
  },
  refreshToken: () => {
    // Todas las peticiones esperan la misma renovación, tanto si funciona como si falla.
    if (!pendingRefresh) {
      pendingRefresh = renewSession().finally(() => { pendingRefresh = null; });
    }
    return pendingRefresh;
  },
  getCurrentUser: async () => {
    const token = authService.getToken();
    if (!token) {
      return null;
    }
    const response = await axios.get(`${BACKEND}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (response.data.status === 'success' || response.data.data) {
      const userData = response.data.data || response.data;
      authService.setUserData(userData);
      return userData;
    }
    return null;
  },
  setToken: token => {
    if (!isBrowser()) return;
    currentToken = token;
    sessionStorage.setItem(STORAGE_KEYS.TOKEN, token);
  },
  getToken: () => {
    if (!isBrowser()) return null;
    if (currentToken) {
      return currentToken;
    }
    return sessionStorage.getItem(STORAGE_KEYS.TOKEN);
  },
  setRefreshToken: token => {
    if (!isBrowser()) return;
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
  },
  getRefreshToken: () => {
    if (!isBrowser()) return null;
    return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  },
  setCsrfToken: token => {
    if (!isBrowser()) return;
    sessionStorage.setItem(STORAGE_KEYS.CSRF_TOKEN, token);
  },
  getCsrfToken: () => {
    if (!isBrowser()) return null;
    return sessionStorage.getItem(STORAGE_KEYS.CSRF_TOKEN);
  },
  setTokenExpiry: expiresAt => {
    if (!isBrowser()) return;
    sessionStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRES_AT, expiresAt);
  },
  getTokenExpiry: () => {
    if (!isBrowser()) return null;
    return sessionStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRES_AT);
  },
  setUserData: data => {
    if (!isBrowser()) return;
    sessionStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(data));
    if (data.id) {
      sessionStorage.setItem(STORAGE_KEYS.USER_ID, String(data.id));
    }
  },
  getUserData: () => {
    if (!isBrowser()) return null;
    const data = sessionStorage.getItem(STORAGE_KEYS.USER_DATA);
    if (data) {
      return JSON.parse(data);
    }
    return null;
  },
  getUserId: () => {
    if (!isBrowser()) return null;
    const fromUserData = authService.getUserData();
    if (fromUserData?.id) {
      return fromUserData.id;
    }
    const fromStorage = sessionStorage.getItem(STORAGE_KEYS.USER_ID);
    return fromStorage ? parseInt(fromStorage, 10) : null;
  },
  isTokenExpired: () => {
    const expiry = authService.getTokenExpiry();
    if (!expiry) {
      return false;
    }
    const expiryTime = new Date(expiry).getTime();
    const now = Date.now();
    const bufferMinutes = 5 * 60 * 1000;
    return now >= expiryTime - bufferMinutes;
  },
  isAuthenticated: () => {
    const token = authService.getToken();
    if (!token) {
      return false;
    }
    if (authService.isTokenExpired()) {
      authService.clearAuth();
      return false;
    }
    return true;
  },
  clearAuth: () => {
    currentToken = null;
    if (!isBrowser()) return;
    sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.CSRF_TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.USER_DATA);
    sessionStorage.removeItem(STORAGE_KEYS.USER_ID);
    sessionStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRES_AT);
    sessionStorage.removeItem('usuarioId');
    sessionStorage.removeItem('usuarioNombre');
    sessionStorage.removeItem('usuarioTipo');
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  },
  getActiveSessions: async () => {
    const token = authService.getToken();
    if (!token) {
      throw new Error('No autenticado');
    }
    const response = await axios.get(`${BACKEND}/sesiones`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data.data || response.data;
  },
  revokeSession: async sessionId => {
    const token = authService.getToken();
    if (!token) {
      throw new Error('No autenticado');
    }
    const response = await axios.delete(`${BACKEND}/sesiones`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      data: {
        session_id: sessionId,
        mode: 'single'
      }
    });
    return response.data;
  },
  revokeOtherSessions: async () => {
    const token = authService.getToken();
    if (!token) {
      throw new Error('No autenticado');
    }
    const response = await axios.delete(`${BACKEND}/sesiones`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      data: {
        mode: 'others'
      }
    });
    return response.data;
  }
};
export default authService;
