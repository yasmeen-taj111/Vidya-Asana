import { apiClient } from './client';
import { ApiResponse, Library, User } from './types';

export interface OwnerStats {
  totalLibraries: number;
  pending: number;
  approved: number;
  rejected: number;
  totalUsers: number;
  totalBookings: number;
}

export const ownerApi = {
  async getLibraries(params?: { status?: string; page?: number; pageSize?: number; q?: string }): Promise<{ libraries: Library[]; meta?: ApiResponse<unknown>['meta'] }> {
    const res = await apiClient.get<ApiResponse<Library[]>>('/owner/libraries', { params });
    const responseData = res as unknown as ApiResponse<Library[]>;
    return {
      libraries: responseData.data,
      meta: responseData.meta,
    };
  },

  async getLibrary(id: string): Promise<{ library: Library; admin: User }> {
    const res = await apiClient.get<ApiResponse<{ library: Library; admin: User }>>(`/owner/libraries/${id}`);
    return (res as unknown as ApiResponse<{ library: Library; admin: User }>).data;
  },

  async approveLibrary(id: string): Promise<Library> {
    const res = await apiClient.post<ApiResponse<Library>>(`/owner/libraries/${id}/approve`);
    return (res as unknown as ApiResponse<Library>).data;
  },

  async rejectLibrary(id: string, reason: string): Promise<Library> {
    const res = await apiClient.post<ApiResponse<Library>>(`/owner/libraries/${id}/reject`, { reason });
    return (res as unknown as ApiResponse<Library>).data;
  },

  async getStats(): Promise<OwnerStats> {
    const res = await apiClient.get<ApiResponse<OwnerStats>>('/owner/stats');
    return (res as unknown as ApiResponse<OwnerStats>).data;
  },
};
