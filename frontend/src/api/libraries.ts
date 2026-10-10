import { apiClient } from './client';
import { ApiResponse, Library, TimeSlot, FloorGrid, SeatSuggestion, SeatType } from './types';

export interface DiscoverParams {
  q?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  seatType?: SeatType;
  isFree?: boolean;
  amenities?: string;
  page?: number;
}

export interface RecommendationParams {
  lat?: number;
  lng?: number;
  seatType?: SeatType;
  groupSize?: number;
  isFree?: boolean;
}

export interface SuggestSeatsPayload {
  date: string;
  slotId: string;
  preferences: {
    seatType?: SeatType;
    groupSize?: number;
    window?: boolean;
    powerOutlet?: boolean;
    quietZone?: boolean;
    floorId?: string;
  };
}

export const librariesApi = {
  async getLibraries(params?: DiscoverParams): Promise<{ libraries: Library[]; meta?: ApiResponse<unknown>['meta'] }> {
    const res = await apiClient.get<ApiResponse<Library[]>>('/libraries', { params });
    const responseData = res as unknown as ApiResponse<Library[]>;
    return {
      libraries: responseData.data,
      meta: responseData.meta,
    };
  },

  async getRecommendations(params?: RecommendationParams): Promise<Library[]> {
    const res = await apiClient.get<ApiResponse<Library[]>>('/recommendations/libraries', { params });
    return (res as unknown as ApiResponse<Library[]>).data;
  },

  async getLibrary(id: string): Promise<Library> {
    const res = await apiClient.get<ApiResponse<Library>>(`/libraries/${id}`);
    return (res as unknown as ApiResponse<Library>).data;
  },

  async getSlots(libraryId: string): Promise<TimeSlot[]> {
    const res = await apiClient.get<ApiResponse<TimeSlot[]>>(`/libraries/${libraryId}/slots`);
    return (res as unknown as ApiResponse<TimeSlot[]>).data;
  },

  async getFloors(libraryId: string): Promise<{ id: string; floorNumber: number; label: string; rows: number; cols: number }[]> {
    const res = await apiClient.get<ApiResponse<{ id: string; floorNumber: number; label: string; rows: number; cols: number }[]>>(`/libraries/${libraryId}/floors`);
    return (res as unknown as ApiResponse<{ id: string; floorNumber: number; label: string; rows: number; cols: number }[]>).data;
  },

  async getFloorGrid(libraryId: string, floorId: string, date?: string, slotId?: string): Promise<FloorGrid> {
    const res = await apiClient.get<ApiResponse<FloorGrid>>(`/libraries/${libraryId}/floors/${floorId}/grid`, {
      params: { date, slotId },
    });
    return (res as unknown as ApiResponse<FloorGrid>).data;
  },

  async suggestSeats(libraryId: string, payload: SuggestSeatsPayload): Promise<SeatSuggestion[]> {
    const res = await apiClient.post<ApiResponse<{ suggestions: SeatSuggestion[] }>>(`/libraries/${libraryId}/suggest-seats`, payload);
    return (res as unknown as ApiResponse<{ suggestions: SeatSuggestion[] }>).data.suggestions;
  },
};
