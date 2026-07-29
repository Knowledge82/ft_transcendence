import { apiClient } from './client';

export interface Conversation {
  id: number;
  type: 'DIRECT' | 'CHANNEL';
  name: string | null;
}

export interface Message {
  id: number;
  conversationId: number;
  senderId: number;
  content: string;
  createdAt: string;
  sender: {
    id: number;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

export interface Member {
  id: number;
  displayName: string | null;
  avatarUrl: string | null;
  isOnline: boolean;
}

export async function getGeneralMembers(): Promise<Member[]> {
  const { data } = await apiClient.get<Member[]>('/chat/general/members');
  return data;
}

export async function getGeneralChannel(): Promise<Conversation> {
  const { data } = await apiClient.get<Conversation>('/chat/general');
  return data;
}

export async function startDirectConversation(otherUserId: number): Promise<Conversation> {
  const { data } = await apiClient.post<Conversation>(`/chat/dm/${otherUserId}`);
  return data;
}

export async function getMessageHistory(conversationId: number): Promise<Message[]> {
  const { data } = await apiClient.get<Message[]>(`/chat/${conversationId}/messages`);
  return data;
}
