import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_URL || '/api';
const backendOrigin = apiBaseUrl.startsWith('http') ? apiBaseUrl.replace(/\/api\/?$/, '') : '';

const csrfClient = axios.create({
  baseURL: backendOrigin || '',
  withCredentials: true,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
    'Accept': 'application/json',
  },
});

const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  // Ensure XSRF header is sent on cross-origin requests (SPA -> API on different port).
  withXSRFToken: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
    'Accept': 'application/json',
  },
});

const readCookie = (name: string) => {
  if (typeof document === 'undefined') {
    return null;
  }

  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

const refreshCsrfCookie = async () => {
  await csrfClient.get('/sanctum/csrf-cookie');
};

api.interceptors.request.use((config) => {
  const authToken = localStorage.getItem('auth_token');
  if (authToken && config.headers && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  const token = readCookie('XSRF-TOKEN');
  if (token && config.headers && !config.headers['X-XSRF-TOKEN']) {
    config.headers['X-XSRF-TOKEN'] = token;
  }
  return config;
});

// Interceptor to handle CSRF and global errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (error.response?.status === 419 && config && !config._retry) {
      config._retry = true;
      await refreshCsrfCookie();
      return api.request(config);
    }
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      // Handle unauthorized (redirect to login or clear auth state)
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
