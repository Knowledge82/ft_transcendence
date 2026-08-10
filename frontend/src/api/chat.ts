import { apiClient, getAccessToken } from './client';

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
  attachmentUrl: string | null;
  attachmentType: string | null;
  attachmentName: string | null;
  deletedAt: string | null;
  deletedBy: {
    id: number;
    displayName: string | null;
    role: 'HERMANO' | 'INQUISIDOR' | 'ARZOBISPO';
    gender: 'MASCULINO' | 'FEMENINO';
  } | null;
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

export interface DirectConversationSummary {
  id: number;
  otherUser: {
    id: number;
    displayName: string | null;
    avatarUrl: string | null;
    isOnline: boolean;
  } | null;
}

export async function getGeneralMembers(): Promise<Member[]> {
  const { data } = await apiClient.get<Member[]>('/chat/general/members');
  return data;
}

export async function getGeneralChannel(): Promise<Conversation> {
  const { data } = await apiClient.get<Conversation>('/chat/general');
  return data;
}

export async function getDirectConversations(): Promise<DirectConversationSummary[]> {
  const { data } = await apiClient.get<DirectConversationSummary[]>('/chat/conversations/direct');
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

export interface UploadedAttachment {
  filename: string;
  type: string;
  name: string;
}

export async function uploadAttachment(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<UploadedAttachment> {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await apiClient.post<UploadedAttachment>('/chat/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (event) => {
      if (onProgress && event.total) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    },
  });
  return data;
}

export async function deleteMessage(messageId: number): Promise<Message> {
  const { data } = await apiClient.delete<Message>(`/chat/messages/${messageId}`);
  return data;
}

// Plain <img src="..."> and <a href="..."> tags can't send our usual
// Authorization header — the browser fetches them natively, bypassing
// axios entirely. This appends the current access token as a query
// param instead, which our attachment-serving endpoint accepts as a
// fallback specifically for this reason.
export function withAuthToken(url: string): string {
  const token = getAccessToken();
  if (!token) {
    return url;
  }
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}token=${encodeURIComponent(token)}`;
}
