import axios from 'axios';
import api from './client';
import type { AnalyticsData, FileItem, FileVersion, FolderItem, JobStatus, PublicFileInfo, SearchResult, ShareLink, ShareLinkWithFile, TrashItem, UserDto } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
const publicApi = axios.create({ baseURL: BASE_URL });

// Auth is handled entirely by Clerk — no custom auth API needed.

// User API
export const userApi = {
  getMe: () => api.get<UserDto>('/users/me'),
};

// File API
export const fileApi = {
  list: (folderId?: string) =>
    api.get<FileItem[]>('/files', { params: folderId ? { folderId } : {} }),

  download: (fileId: string) =>
    api.get<{ url: string }>(`/files/${fileId}/download`),

  rename: (fileId: string, name: string) =>
    api.patch<FileItem>(`/files/${fileId}`, { name }),

  move: (fileId: string, folderId: string | null) =>
    api.patch<FileItem>(`/files/${fileId}/move`, { folderId }),

  delete: (fileId: string) =>
    api.delete(`/files/${fileId}`),
};

// Version API
export const versionApi = {
  list: (fileId: string) =>
    api.get<FileVersion[]>(`/files/${fileId}/versions`),

  restore: (fileId: string, versionId: string) =>
    api.post<FileItem>(`/files/${fileId}/versions/${versionId}/restore`),

  delete: (fileId: string, versionId: string) =>
    api.delete(`/files/${fileId}/versions/${versionId}`),
};

// Chunked Upload API
export const chunkApi = {
  init: (
    data: { fileName: string; fileSize: number; totalChunks: number; contentType: string; folderId?: string; hash?: string | null },
    signal?: AbortSignal
  ) =>
    api.post<{ uploadId?: string; key?: string; parts?: { partNumber: number; url: string }[]; duplicate: boolean; fileItem?: FileItem }>('/chunks/init', data, { signal }),

  status: (uploadId: string) =>
    api.get<{ uploadId: string; fileName: string; fileSize: number; totalChunks: number; uploadedChunks: number[]; status: string }>(
      `/chunks/${uploadId}/status`
    ),

  complete: (uploadId: string, signal?: AbortSignal) =>
    api.post<FileItem>(`/chunks/${uploadId}/complete`, {}, { signal }),

  cancel: (uploadId: string) =>
    api.delete(`/chunks/${uploadId}`),
};

// Jobs API
export const jobsApi = {
  getStatus: () => api.get<JobStatus[]>('/jobs'),
  trigger: (jobName: string) => api.post(`/jobs/${jobName}/run`),
};

// Trash API
export const trashApi = {
  list: () =>
    api.get<TrashItem[]>('/trash'),

  restore: (fileId: string) =>
    api.post<TrashItem>(`/trash/${fileId}/restore`),

  delete: (fileId: string) =>
    api.delete(`/trash/${fileId}`),

  empty: () =>
    api.delete('/trash'),
};

// Analytics API
export const analyticsApi = {
  get: () => api.get<AnalyticsData>('/analytics'),
};

// Search API
export const searchApi = {
  search: (params: { q?: string; type?: string; from?: string; to?: string }) =>
    api.get<SearchResult[]>('/search', { params }),
};

// Share API (auth required)
export const shareApi = {
  create: (fileId: string, data: { password?: string; expiresInHours?: number | null }) =>
    api.post<ShareLink>(`/files/${fileId}/share`, data),

  list: (fileId: string) =>
    api.get<ShareLink[]>(`/files/${fileId}/shares`),

  listAll: () =>
    api.get<ShareLinkWithFile[]>('/shares'),

  revoke: (token: string) =>
    api.delete(`/share/${token}`),
};

// Public Share API (no auth)
export const publicShareApi = {
  info: (token: string) =>
    publicApi.get<PublicFileInfo>(`/share/${token}`),

  download: (token: string, password?: string) =>
    publicApi.get<{ url: string; fileName: string }>(`/share/${token}/download`, {
      params: password ? { password } : {},
    }),
};

// Folder API
export const folderApi = {
  list: (parentFolderId?: string) =>
    api.get<FolderItem[]>('/folders', { params: parentFolderId ? { parentFolderId } : {} }),

  create: (data: { name: string; parentFolderId?: string }) =>
    api.post<FolderItem>('/folders', data),

  breadcrumb: (folderId: string) =>
    api.get<FolderItem[]>(`/folders/${folderId}/breadcrumb`),

  rename: (folderId: string, name: string) =>
    api.patch<FolderItem>(`/folders/${folderId}`, { name }),

  listAll: () =>
    api.get<FolderItem[]>('/folders/all'),

  delete: (folderId: string) =>
    api.delete(`/folders/${folderId}`),
};
