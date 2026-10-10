import { apiClient } from './client';
import { ApiResponse, User, Library } from './types';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface RegisterLibraryPayload {
  admin: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  };
  library: {
    name: string;
    description?: string;
    address: string;
    city: string;
    latitude: number;
    longitude: number;
    contactEmail: string;
    contactPhone?: string;
    amenities: {
      lockers: boolean;
      cctv: boolean;
      ac: boolean;
      wifi: boolean;
      powerOutlets: boolean;
    };
    isFree: boolean;
    slotPricing?: {
      morningPrice?: number;
      afternoonPrice?: number;
      eveningPrice?: number;
      nightPrice?: number;
    };
  };
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const authApi = {
  async register(payload: RegisterPayload): Promise<{ user: User; accessToken: string }> {
    const res = await apiClient.post<ApiResponse<{ user: User; accessToken: string }>>('/auth/register', payload);
    return (res as unknown as ApiResponse<{ user: User; accessToken: string }>).data;
  },

  async registerLibrary(payload: RegisterLibraryPayload): Promise<{ user: User; accessToken: string; library: Library }> {
    const res = await apiClient.post<ApiResponse<{ user: User; accessToken: string; library: Library }>>('/auth/register-library', payload);
    return (res as unknown as ApiResponse<{ user: User; accessToken: string; library: Library }>).data;
  },

  async login(payload: LoginPayload): Promise<{ user: User; accessToken: string }> {
    const res = await apiClient.post<ApiResponse<{ user: User; accessToken: string }>>('/auth/login', payload);
    return (res as unknown as ApiResponse<{ user: User; accessToken: string }>).data;
  },

  async refresh(): Promise<{ accessToken: string }> {
    const res = await apiClient.post<ApiResponse<{ accessToken: string }>>('/auth/refresh');
    return (res as unknown as ApiResponse<{ accessToken: string }>).data;
  },

  async logout(): Promise<{ ok: boolean }> {
    const res = await apiClient.post<ApiResponse<{ ok: boolean }>>('/auth/logout');
    return (res as unknown as ApiResponse<{ ok: boolean }>).data;
  },

  async getMe(): Promise<{ user: User }> {
    const res = await apiClient.get<ApiResponse<{ user: User }>>('/auth/me');
    return (res as unknown as ApiResponse<{ user: User }>).data;
  },
};
