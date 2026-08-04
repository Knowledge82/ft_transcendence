import { apiClient } from './client';

export interface PublicProfile {
  id: number;
  displayName: string | null;
  avatarUrl: string | null;
  role: 'HERMANO' | 'GUARDIAN' | 'ARZOBISPO';
  isOnline: boolean;
  createdAt: string;
}

export async function getPublicProfile(userId: number): Promise<PublicProfile> {
  const { data } = await apiClient.get<PublicProfile>(`/users/${userId}`);
  return data;
}
