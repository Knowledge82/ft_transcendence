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

export interface PendingRequest {
  id: number;
  requesterId: number;
  requester: {
    id: number;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

export async function listPendingRequests(): Promise<PendingRequest[]> {
  const { data } = await apiClient.get<PendingRequest[]>('/friends/requests');
  return data;
}

export async function acceptFriendRequest(requesterId: number): Promise<void> {
  await apiClient.post(`/friends/${requesterId}/accept`);
}

export async function sendFriendRequest(userId: number): Promise<void> {
  await apiClient.post(`/friends/request/${userId}`);
}
