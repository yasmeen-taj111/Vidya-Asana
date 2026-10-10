import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ApiErrorCode, ApiErrorDetails } from './types';
import { useAuthStore } from '../store/authStore';

export class ApiError extends Error {
  code: ApiErrorCode;
  details?: ApiErrorDetails;
  status: number;

  constructor(code: ApiErrorCode, message: string, status: number, details?: ApiErrorDetails) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    // If the backend envelope is { success: true, data: ..., meta: ... }
    if (response.data && typeof response.data === 'object' && 'success' in response.data) {
      if (response.data.success) {
        return response.data;
      }
    }
    return response.data;
  },
  async (error: AxiosError<{ success: boolean; error: { code: ApiErrorCode; message: string; details?: ApiErrorDetails } }>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/refresh') && !originalRequest.url?.includes('/auth/login')) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers && token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await axios.post<{ success: boolean; data: { accessToken: string } }>(
          `${baseURL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newToken = refreshResponse.data?.data?.accessToken;
        if (newToken) {
          useAuthStore.getState().setAccessToken(newToken);
          processQueue(null, newToken);
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          return apiClient(originalRequest);
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        useAuthStore.getState().logout();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    const errorData = error.response?.data?.error;
    if (errorData) {
      return Promise.reject(
        new ApiError(
          errorData.code || 'INTERNAL_ERROR',
          errorData.message || 'An unexpected error occurred.',
          error.response?.status || 500,
          errorData.details
        )
      );
    }

    return Promise.reject(
      new ApiError(
        'INTERNAL_ERROR',
        error.message || 'Network error',
        error.response?.status || 500
      )
    );
  }
);
