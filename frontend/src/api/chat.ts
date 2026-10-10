import { apiClient } from './client';
import { ApiResponse, ChatReply } from './types';

export const chatApi = {
  async sendMessage(message: string, conversationId?: string): Promise<ChatReply> {
    const res = await apiClient.post<ApiResponse<ChatReply>>('/chat', {
      message,
      conversationId,
    });
    return (res as unknown as ApiResponse<ChatReply>).data;
  },
};
