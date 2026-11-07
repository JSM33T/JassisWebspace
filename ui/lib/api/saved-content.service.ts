import { apiClient } from './client';

export interface SavedStatus {
  contentId: string;
  isSaved: boolean;
  savedAt: string | null;
}

export interface SavedItem {
  contentId: string;
  contentType: 'Blog' | 'Album' | 'Music';
  title: string;
  description: string | null;
  cover: string | null;
  href: string;
  savedAt: string;
}

export interface SavedPage {
  items: SavedItem[];
  page: number;
  pageSize: number;
  total: number;
}

export const savedContentService = {
  statuses: (contentIds: string[]) => apiClient.post<SavedStatus[]>('/saved-content/status', { contentIds }),
  save: (contentId: string) => apiClient.put<SavedStatus>(`/saved-content/${contentId}`),
  remove: (contentId: string) => apiClient.delete<SavedStatus>(`/saved-content/${contentId}`),
  list: (page: number, contentType?: string) => apiClient.get<SavedPage>(`/saved-content?page=${page}&pageSize=20${contentType ? `&contentType=${encodeURIComponent(contentType)}` : ''}`),
};
