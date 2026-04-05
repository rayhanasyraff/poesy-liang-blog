// utils/apiLogger.ts
import { logger, safeLog } from '@/utils/loggers/loggers';
import { AxiosError } from 'axios';

export interface ApiErrorInfo {
  status?: number;
  method: string;
  url: string;
  data?: any;
  request?: any;
  message?: string;
}

/**
 * Logs an Axios error safely and exposes dev-only globals
 */
export function logAxiosError(error: unknown): void {
  safeLog(() => {
    // Safely access request URL and method
    const url = (error as AxiosError)?.config?.url ?? '<unknown url>';
    const method = ((error as AxiosError)?.config?.method || '').toUpperCase();

    if ((error as AxiosError)?.response) {
      const status = (error as AxiosError).response!.status;
      const data = (error as AxiosError).response!.data;
      logger.error(`API Error: ${status} ${method} ${url}`, data);

      if (globalThis.window !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis.window as any).__lastApiError = { status, method, url, data };
      }
    } else if ((error as AxiosError)?.request) {
      logger.error('Network Error:', (error as AxiosError).message, (error as AxiosError).request);

      if (globalThis.window !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis.window as any).__lastApiError = { message: (error as AxiosError).message, method, url, request: (error as AxiosError).request };
      }
    } else {
      logger.error('Error:', (error as Error).message);

      if (globalThis.window !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis.window as any).__lastApiError = { message: (error as Error).message, method, url };
      }
    }
  });
}