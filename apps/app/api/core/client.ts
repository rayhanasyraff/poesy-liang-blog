import axios from 'axios';
import { logAxiosError } from '@/api/core/loggers/apiLogger';
import { getClientApiUrl } from '@/api/core/apiUrl';

// Create and export a preconfigured axios instance for the application's API calls.
// Using a single shared instance lets the app centralize headers, base URL, timeouts,
// and request/response interceptors in one place.
export const apiClient = axios.create({
  // baseURL: the root URL that will be prefixed to all relative request URLs.
  baseURL: getClientApiUrl(),
  // Default headers applied to every request unless overridden per-request.
  headers: {
    // Tell the server to expect/send JSON by default.
    'Content-Type': 'application/json',
    // If an API_TOKEN environment variable is present at build/run time, include it
    // as a Bearer token on every request. This is useful for server-side or CI usage.
    ...(process.env.API_TOKEN ? { Authorization: `Bearer ${process.env.API_TOKEN}` } : {}),
  },
  // Request timeout in milliseconds (30 seconds). Requests taking longer will be aborted.
  timeout: 30000,
});

// Request interceptor: runs before each request is sent.
// Use this to add runtime auth tokens (e.g., from localStorage or cookies) or to
// modify the request config centrally.
apiClient.interceptors.request.use(
  (config) => {
    // Example placeholder: fetch a token from localStorage and attach it to headers.
    // This is commented out because it depends on the environment (browser vs server).
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }

    // Always return the (possibly modified) config so the request proceeds.
    return config;
  },
  (error) => {
    // If an error occurred while preparing the request, propagate it to callers.
    return Promise.reject(error);
  }
);

// Response interceptor: runs after a response is received (or an error occurs).
// Centralizes error logging and optional dev-only debugging helpers.
apiClient.interceptors.response.use(
  // For successful responses, simply return the response so callers receive it.
  (response) => response,
  // For errors, inspect the shape (response, request, or other) and log useful info.
  (error) => {
    logAxiosError(error);
    return Promise.reject(error); // re-throw for caller
  }
);
