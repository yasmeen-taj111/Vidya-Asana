import { apiClient } from './client';
import {
  ApiResponse,
  DashboardStats,
  UserPreferences,
  StudySessionType,
  StudyReport,
  LeaderboardEntry,
} from './types';

export interface RecordSessionPayload {
  type: StudySessionType;
  startedAt: string;
  endedAt: string;
  focusSeconds: number;
  breakSeconds?: number;
  bookingId?: string;
}

export const studyApi = {
  async getDashboard(): Promise<DashboardStats> {
    const res = await apiClient.get<ApiResponse<DashboardStats>>('/users/me/dashboard');
    return (res as unknown as ApiResponse<DashboardStats>).data;
  },

  async getPreferences(): Promise<UserPreferences> {
    const res = await apiClient.get<ApiResponse<UserPreferences>>('/users/me/preferences');
    return (res as unknown as ApiResponse<UserPreferences>).data;
  },

  async updatePreferences(prefs: UserPreferences): Promise<UserPreferences> {
    const res = await apiClient.put<ApiResponse<UserPreferences>>('/users/me/preferences', prefs);
    return (res as unknown as ApiResponse<UserPreferences>).data;
  },

  async recordSession(payload: RecordSessionPayload): Promise<{ id: string }> {
    const res = await apiClient.post<ApiResponse<{ id: string }>>('/study/sessions', payload);
    return (res as unknown as ApiResponse<{ id: string }>).data;
  },

  async getReports(range: 'week' | 'month' = 'week'): Promise<StudyReport> {
    const res = await apiClient.get<ApiResponse<StudyReport>>('/study/reports', {
      params: { range },
    });
    return (res as unknown as ApiResponse<StudyReport>).data;
  },

  async getLeaderboard(params?: {
    scope?: 'library' | 'global';
    period?: 'week' | 'month';
    libraryId?: string;
  }): Promise<{ entries: LeaderboardEntry[]; myRank?: number }> {
    const res = await apiClient.get<ApiResponse<{ entries: LeaderboardEntry[]; myRank?: number }>>(
      '/study/leaderboard',
      { params }
    );
    return (res as unknown as ApiResponse<{ entries: LeaderboardEntry[]; myRank?: number }>).data;
  },
};
