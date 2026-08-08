import { apiClient } from './client';

export interface CommunityEvent {
  id: number;
  type: string;
  message: string;
  createdAt: string;
}

export async function getCommunityFeed(): Promise<CommunityEvent[]> {
  const { data } = await apiClient.get<CommunityEvent[]>('/community/feed');
  return data;
}

export async function getTodayCommunityFeed(): Promise<CommunityEvent[]> {
  const { data } = await apiClient.get<CommunityEvent[]>('/community/feed/today');
  return data;
}
