import { apiClient } from './client';

export interface Friend {
  id: number;
  displayName: string | null;
  avatarUrl: string | null;
  isOnline: boolean;
}

export async function listFriends(): Promise<Friend[]> {
  const { data } = await apiClient.get<Friend[]>('/friends');
  return data;
}
