import { apiClient } from './client';

export interface Notification {
  id: number;
  type: string;
  params: Record<string, string> | null;
  isRead: boolean;
  createdAt: string;
}

export async function getNotifications(): Promise<Notification[]> {
  const { data } = await apiClient.get<Notification[]>('/notifications');
  return data;
}

export async function getUnreadCount(): Promise<number> {
  const { data } = await apiClient.get<{ count: number }>('/notifications/unread-count');
  return data.count;
}

export async function markNotificationAsRead(id: number): Promise<void> {
  await apiClient.patch(`/notifications/${id}/read`);
}

export async function markAllNotificationsAsRead(): Promise<void> {
  await apiClient.patch('/notifications/read-all');
}
