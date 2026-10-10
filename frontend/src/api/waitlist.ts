import { apiClient } from './client';
import { ApiResponse, WaitlistEntry, Booking } from './types';

export const waitlistApi = {
  async joinWaitlist(payload: { seatId: string; slotId: string; date: string }): Promise<WaitlistEntry> {
    const res = await apiClient.post<ApiResponse<WaitlistEntry>>('/waitlist', payload);
    return (res as unknown as ApiResponse<WaitlistEntry>).data;
  },

  async getMyWaitlist(): Promise<WaitlistEntry[]> {
    const res = await apiClient.get<ApiResponse<WaitlistEntry[]>>('/waitlist/me');
    return (res as unknown as ApiResponse<WaitlistEntry[]>).data;
  },

  async leaveWaitlist(id: string): Promise<void> {
    await apiClient.delete(`/waitlist/${id}`);
  },

  async claimWaitlist(id: string): Promise<Booking> {
    const res = await apiClient.post<ApiResponse<Booking>>(`/waitlist/${id}/claim`);
    return (res as unknown as ApiResponse<Booking>).data;
  },
};
