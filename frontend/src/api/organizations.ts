import { apiClient } from './client';

export interface OrganizationSummary {
  id: number;
  name: string;
  color: string;
  manifesto: string | null;
  _count: { members: number };
}

export interface OrganizationMemberInfo {
  id: number;
  isLeader: boolean;
  joinedAt: string;
  user: {
    id: number;
    displayName: string | null;
    avatarUrl: string | null;
    role: 'HERMANO' | 'INQUISIDOR' | 'ARZOBISPO';
    gender: 'MASCULINO' | 'FEMENINO';
  };
}

export interface OrganizationDetail {
  id: number;
  name: string;
  manifesto: string | null;
  color: string;
  createdAt: string;
  updatedAt: string;
  members: OrganizationMemberInfo[];
  conversation: { id: number } | null;
}

export async function listOrganizations(): Promise<OrganizationSummary[]> {
  const { data } = await apiClient.get<OrganizationSummary[]>('/organizations');
  return data;
}

export async function getOrganizationById(id: number): Promise<OrganizationDetail> {
  const { data } = await apiClient.get<OrganizationDetail>(`/organizations/${id}`);
  return data;
}

export async function createOrganization(
  name: string,
  color: string,
): Promise<OrganizationDetail> {
  const { data } = await apiClient.post<OrganizationDetail>('/organizations', { name, color });
  return data;
}

export async function updateOrganization(
  id: number,
  updates: { name?: string; manifesto?: string; color?: string },
): Promise<OrganizationDetail> {
  const { data } = await apiClient.patch<OrganizationDetail>(`/organizations/${id}`, updates);
  return data;
}

export async function deleteOrganization(id: number): Promise<void> {
  await apiClient.delete(`/organizations/${id}`);
}

export async function joinOrganization(id: number): Promise<OrganizationDetail> {
  const { data } = await apiClient.post<OrganizationDetail>(`/organizations/${id}/join`);
  return data;
}

export async function leaveOrganization(): Promise<void> {
  await apiClient.post('/organizations/leave');
}

export async function removeOrganizationMember(
  organizationId: number,
  userId: number,
): Promise<void> {
  await apiClient.delete(`/organizations/${organizationId}/members/${userId}`);
}
