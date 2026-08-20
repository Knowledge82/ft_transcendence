import { apiClient } from './client';

export interface Article {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  author: {
    id: number;
    displayName: string | null;
    avatarUrl: string | null;
    role: 'HERMANO' | 'INQUISIDOR' | 'ARZOBISPO';
    gender: 'MASCULINO' | 'FEMENINO';
  };
  organization: { id: number; name: string; color: string } | null;
}

export async function getAllArticles(): Promise<Article[]> {
  const { data } = await apiClient.get<Article[]>('/articles');
  return data;
}

export async function getOrganizationArticles(organizationId: number): Promise<Article[]> {
  const { data } = await apiClient.get<Article[]>(`/articles/organization/${organizationId}`);
  return data;
}

export async function getArticleById(id: number): Promise<Article> {
  const { data } = await apiClient.get<Article>(`/articles/${id}`);
  return data;
}

export async function getRandomArticles(count = 3): Promise<Article[]> {
  const { data } = await apiClient.get<Article[]>(`/articles/random?count=${count}`);
  return data;
}

export async function createArticle(
  title: string,
  content: string,
  organizationId?: number,
): Promise<Article> {
  const { data } = await apiClient.post<Article>('/articles', { title, content, organizationId });
  return data;
}

export async function updateArticle(
  id: number,
  title: string,
  content: string,
): Promise<Article> {
  const { data } = await apiClient.patch<Article>(`/articles/${id}`, { title, content });
  return data;
}

export async function deleteArticle(id: number): Promise<void> {
  await apiClient.delete(`/articles/${id}`);
}
