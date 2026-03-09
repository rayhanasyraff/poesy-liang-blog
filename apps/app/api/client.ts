import axios from 'axios';
import { getClientApiUrl } from '@/lib/api-port';

export const apiClient = axios.create({
  baseURL: getClientApiUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor for adding auth tokens if needed
apiClient.interceptors.request.use(
  (config) => {
    // Add any auth tokens here if needed
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    try {
      const url = error.config?.url ?? '<unknown url>';
      const method = (error.config?.method || '').toUpperCase();

      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        console.error(`API Error: ${status} ${method} ${url}`, data);
        if (typeof window !== 'undefined') {
          // Expose last API error to window for easier debugging in dev
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).__lastApiError = { status, method, url, data };
        }
      } else if (error.request) {
        console.error('Network Error:', error.message, error.request);
        if (typeof window !== 'undefined') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).__lastApiError = { message: error.message, method, url, request: error.request };
        }
      } else {
        console.error('Error:', error.message);
        if (typeof window !== 'undefined') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).__lastApiError = { message: error.message, method, url };
        }
      }
    } catch (e) {
      try { console.error('Error logging failed:', e); } catch {}
    }
    return Promise.reject(error);
  }
);
