import axios from 'axios';
import type { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

/**
 * API client — centralized Axios instance for all backend requests.
 *
 * In development, requests to /api are proxied by Vite to the Express backend.
 * In production, the baseURL should be set to the API server URL.
 */

const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// ─── Request Interceptor ─────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('erp_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ─── Response Interceptor ────────────────────────────────
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    if (error.response) {
      const { status } = error.response;

      if (status === 401) {
        // Clear session credentials on expired or invalid session
        sessionStorage.removeItem('erp_token');
        sessionStorage.removeItem('erp_user');
      }

      if (status === 429) {
        console.warn('Rate limited — too many requests');
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
