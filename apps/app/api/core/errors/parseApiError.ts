// utils/parseApiError.ts
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
 * Parse AxiosError into structured ApiErrorInfo
 */
export function parseAxiosError(
  error: unknown,
  method: string,
  url: string
): ApiErrorInfo {
  if ((error as AxiosError).isAxiosError) {
    const axiosError = error as AxiosError;

    if (axiosError.response) {
      return {
        status: axiosError.response.status,
        method,
        url,
        data: axiosError.response.data,
      };
    } else if (axiosError.request) {
      return {
        method,
        url,
        message: axiosError.message,
        request: axiosError.request,
      };
    }
  }

  return { method, url, message: (error as Error)?.message || 'Unknown error' };
}