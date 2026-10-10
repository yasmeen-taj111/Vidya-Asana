import { apiClient } from './client';
import {
  ApiResponse,
  Library,
  FloorGrid,
  Seat,
  TimeSlot,
  Booking,
  AnalyticsSummary,
  AnalyticsTimeseriesPoint,
  SeatType,
  Facing,
  SeatAttributes,
  CellType,
} from './types';

export interface GenerateFloorSpec {
  floorNumber: number;
  label: string;
  rows: number;
  cols: number;
  counts: Record<SeatType, number>;
}

export interface LayoutUpdateCell {
  row: number;
  col: number;
  type: CellType;
  seat?: {
    id?: string;
    label: string;
    seatType: SeatType;
    facing: Facing;
    attributes: SeatAttributes;
    groupCapacity?: number;
  };
}

export const adminApi = {
  async getLibrary(): Promise<Library> {
    const res = await apiClient.get<ApiResponse<Library>>('/admin/library');
    return (res as unknown as ApiResponse<Library>).data;
  },

  async updateLibrary(data: Partial<Library>): Promise<Library> {
    const res = await apiClient.put<ApiResponse<Library>>('/admin/library', data);
    return (res as unknown as ApiResponse<Library>).data;
  },

  async generateGrid(floors: GenerateFloorSpec[]): Promise<FloorGrid[]> {
    const res = await apiClient.post<ApiResponse<FloorGrid[]>>('/admin/library/grid/generate', { floors });
    return (res as unknown as ApiResponse<FloorGrid[]>).data;
  },

  async getFloors(): Promise<{ id: string; floorNumber: number; label: string; rows: number; cols: number }[]> {
    const res = await apiClient.get<ApiResponse<{ id: string; floorNumber: number; label: string; rows: number; cols: number }[]>>('/admin/floors');
    return (res as unknown as ApiResponse<{ id: string; floorNumber: number; label: string; rows: number; cols: number }[]>).data;
  },

  async createFloor(data: { floorNumber: number; label: string; rows: number; cols: number }) {
    const res = await apiClient.post<ApiResponse<unknown>>('/admin/floors', data);
    return (res as unknown as ApiResponse<unknown>).data;
  },

  async deleteFloor(floorId: string) {
    const res = await apiClient.delete<ApiResponse<unknown>>(`/admin/floors/${floorId}`);
    return (res as unknown as ApiResponse<unknown>).data;
  },

  async getFloorGrid(floorId: string): Promise<FloorGrid> {
    const res = await apiClient.get<ApiResponse<FloorGrid>>(`/admin/floors/${floorId}/grid`);
    return (res as unknown as ApiResponse<FloorGrid>).data;
  },

  async updateFloorLayout(floorId: string, layout: { rows: number; cols: number; cells: LayoutUpdateCell[] }): Promise<FloorGrid> {
    const res = await apiClient.put<ApiResponse<FloorGrid>>(`/admin/floors/${floorId}/layout`, layout);
    return (res as unknown as ApiResponse<FloorGrid>).data;
  },

  async patchSeat(seatId: string, data: Partial<Seat>): Promise<Seat> {
    const res = await apiClient.patch<ApiResponse<Seat>>(`/admin/seats/${seatId}`, data);
    return (res as unknown as ApiResponse<Seat>).data;
  },

  async getSlots(): Promise<TimeSlot[]> {
    const res = await apiClient.get<ApiResponse<TimeSlot[]>>('/admin/slots');
    return (res as unknown as ApiResponse<TimeSlot[]>).data;
  },

  async createSlot(data: Omit<TimeSlot, 'id' | 'libraryId' | 'isActive'>): Promise<TimeSlot> {
    const res = await apiClient.post<ApiResponse<TimeSlot>>('/admin/slots', data);
    return (res as unknown as ApiResponse<TimeSlot>).data;
  },

  async updateSlot(slotId: string, data: Partial<TimeSlot>): Promise<TimeSlot> {
    const res = await apiClient.put<ApiResponse<TimeSlot>>(`/admin/slots/${slotId}`, data);
    return (res as unknown as ApiResponse<TimeSlot>).data;
  },

  async deleteSlot(slotId: string): Promise<void> {
    await apiClient.delete(`/admin/slots/${slotId}`);
  },

  async getBookings(params?: { date?: string; slotId?: string; status?: string; page?: number }): Promise<{ bookings: Booking[]; meta?: ApiResponse<unknown>['meta'] }> {
    const res = await apiClient.get<ApiResponse<Booking[]>>('/admin/bookings', { params });
    const responseData = res as unknown as ApiResponse<Booking[]>;
    return {
      bookings: responseData.data,
      meta: responseData.meta,
    };
  },

  async scanQR(qrToken: string): Promise<{ booking: Booking; result: 'CHECKED_IN' | 'ALREADY_CHECKED_IN' }> {
    const res = await apiClient.post<ApiResponse<{ booking: Booking; result: 'CHECKED_IN' | 'ALREADY_CHECKED_IN' }>>('/admin/checkin/scan', { qrToken });
    return (res as unknown as ApiResponse<{ booking: Booking; result: 'CHECKED_IN' | 'ALREADY_CHECKED_IN' }>).data;
  },

  async walkIn(data: { seatId: string; slotId: string; date: string; guestName?: string }, idempotencyKey: string): Promise<Booking> {
    const res = await apiClient.post<ApiResponse<Booking>>('/admin/bookings/walk-in', data, {
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    });
    return (res as unknown as ApiResponse<Booking>).data;
  },

  async releaseSeat(bookingId: string): Promise<Booking> {
    const res = await apiClient.post<ApiResponse<Booking>>(`/admin/bookings/${bookingId}/release`);
    return (res as unknown as ApiResponse<Booking>).data;
  },

  async getAnalyticsSummary(params?: { date?: string; slotId?: string }): Promise<AnalyticsSummary> {
    const res = await apiClient.get<ApiResponse<AnalyticsSummary>>('/admin/analytics/summary', { params });
    return (res as unknown as ApiResponse<AnalyticsSummary>).data;
  },

  async getAnalyticsTimeseries(params?: { from?: string; to?: string; groupBy?: 'day' | 'slot' | 'seatType' }): Promise<{ points: AnalyticsTimeseriesPoint[] }> {
    const res = await apiClient.get<ApiResponse<{ points: AnalyticsTimeseriesPoint[] }>>('/admin/analytics/timeseries', { params });
    return (res as unknown as ApiResponse<{ points: AnalyticsTimeseriesPoint[] }>).data;
  },

  async exportReport(format: 'csv' | 'pdf', from?: string, to?: string): Promise<Blob> {
    const res = await apiClient.get('/admin/reports/export', {
      params: { format, from, to },
      responseType: 'blob',
    });
    return res as unknown as Blob;
  },
};
