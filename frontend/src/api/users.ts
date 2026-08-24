import { apiClient } from './client';

export interface PublicProfile {
  id: number;
  displayName: string | null;
  avatarUrl: string | null;
  avatarPositionX: number;
  avatarPositionY: number;
  role: 'HERMANO' | 'INQUISIDOR' | 'ARZOBISPO';
  gender: 'MASCULINO' | 'FEMENINO';
  isOnline: boolean;
  createdAt: string;
  organizationMembership: {
    isLeader: boolean;
    organization: { id: number; name: string; color: string };
  } | null;
}

export interface UserStats {
  loginCount: number;
  articleCount: number;
  memberSince: string | null;
}

export async function getPublicProfile(userId: number): Promise<PublicProfile> {
  const { data } = await apiClient.get<PublicProfile>(`/users/${userId}`);
  return data;
}

export async function getMyStats(): Promise<UserStats> {
  const { data } = await apiClient.get<UserStats>('/users/me/stats');
  return data;
}
