import { apiClient } from './client';
import { ApiResponse, Booking } from './types';

export interface CreateBookingPayload {
  libraryId: string;
  seatId: string;
  slotId?: string;
  startTime?: string;
  endTime?: string;
  date: string;
}

export interface BookingQRResponse {
  qrToken: string;
  qrDataUrl: string;
  expiresAt: string;
}

export const bookingsApi = {
  async createBooking(payload: CreateBookingPayload, idempotencyKey: string): Promise<Booking> {
    const res = await apiClient.post<ApiResponse<Booking>>('/bookings', payload, {
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    });
    return (res as unknown as ApiResponse<Booking>).data;
  },

  async getMyBookings(params?: { status?: string; upcoming?: boolean; page?: number }): Promise<{ bookings: Booking[]; meta?: ApiResponse<unknown>['meta'] }> {
    const res = await apiClient.get<ApiResponse<Booking[]>>('/bookings/me', { params });
    const responseData = res as unknown as ApiResponse<Booking[]>;
    return {
      bookings: responseData.data,
      meta: responseData.meta,
    };
  },

  async getBooking(id: string): Promise<Booking> {
    const res = await apiClient.get<ApiResponse<Booking>>(`/bookings/${id}`);
    return (res as unknown as ApiResponse<Booking>).data;
  },

  async getBookingQR(id: string): Promise<BookingQRResponse> {
    const res = await apiClient.get<ApiResponse<BookingQRResponse>>(`/bookings/${id}/qr`);
    return (res as unknown as ApiResponse<BookingQRResponse>).data;
  },

  async cancelBooking(id: string): Promise<Booking> {
    const res = await apiClient.post<ApiResponse<Booking>>(`/bookings/${id}/cancel`);
    return (res as unknown as ApiResponse<Booking>).data;
  },

  async confirmArrival(id: string, coming: boolean): Promise<Booking> {
    const res = await apiClient.post<ApiResponse<Booking>>(`/bookings/${id}/confirm-arrival`, { coming });
    return (res as unknown as ApiResponse<Booking>).data;
  },
};
