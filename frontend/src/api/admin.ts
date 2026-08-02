import { apiClient } from './client';

export type Role = 'HERMANO' | 'GUARDIAN' | 'ARZOBISPO';

export interface AdminUser {
  id: number;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: Role;
  createdAt: string;
}

export async function listAllUsers(): Promise<AdminUser[]> {
  const { data } = await apiClient.get<AdminUser[]>('/admin/users');
  return data;
}

export async function changeUserRole(userId: number, role: Role): Promise<AdminUser> {
  const { data } = await apiClient.patch<AdminUser>(`/admin/users/${userId}/role`, { role });
  return data;
}

export async function deleteUser(userId: number): Promise<void> {
  await apiClient.delete(`/admin/users/${userId}`);
}
