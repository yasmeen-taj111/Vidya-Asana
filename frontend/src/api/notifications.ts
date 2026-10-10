import { apiClient } from './client';
import { ApiResponse, Notification } from './types';

export const notificationsApi = {
  async getNotifications(unread?: boolean, page?: number): Promise<Notification[]> {
    const res = await apiClient.get<ApiResponse<Notification[]>>('/notifications', {
      params: { unread, page },
    });
    return (res as unknown as ApiResponse<Notification[]>).data;
  },

  async markRead(id: string): Promise<void> {
    await apiClient.post(`/notifications/${id}/read`);
  },

  async markAllRead(): Promise<void> {
    await apiClient.post('/notifications/read-all');
  },
};
