export interface UserDto {
  id: string;
  email: string;
  fullName: string | null;
  storageUsed: number;
  storageLimit: number;
  createdAt: string;
}

export interface ApiError {
  timestamp: string;
  message: string;
  status: number;
  errors?: Record<string, string>;
}

export interface FileItem {
  id: string;
  folderId: string | null;
  name: string;
  size: number;
  contentType: string;
  createdAt: string;
}

export interface FolderItem {
  id: string;
  userId: string;
  name: string;
  parentFolderId: string | null;
  createdAt: string;
  itemCount?: number;
}

export interface FileVersion {
  id: string;
  fileId: string;
  version: number;
  size: number;
  createdAt: string;
  current: boolean;
}

export interface ShareLink {
  id: string;
  fileId: string;
  token: string;
  hasPassword: boolean;
  expiresAt: string | null;
  downloadCount: number;
  createdAt: string;
  url: string;
}

export interface ShareLinkWithFile extends ShareLink {
  fileName: string;
  fileSize: number;
  contentType: string;
}

export interface PublicFileInfo {
  fileName: string;
  size: number;
  contentType: string;
  passwordProtected: boolean;
}

export interface SearchResult {
  id: string;
  name: string;
  size: number;
  contentType: string;
  folderId: string | null;
  folderName: string | null;
  createdAt: string;
}

export interface JobStatus {
  jobName: string;
  description: string;
  schedule: string;
  lastRun: string | null;
  lastCount: number;
  lastResult: string;
}

export interface TrashItem {
  id: string;
  name: string;
  size: number;
  contentType: string;
  folderId: string | null;
  folderName: string | null;
  deletedAt: string;
}

export interface ActivityItem {
  id: string;
  action: string;
  fileName: string | null;
  fileSize: number | null;
  createdAt: string;
}

export interface FileStats {
  id: string;
  name: string;
  size: number;
  contentType: string;
  downloadCount: number;
}

export interface TypeBreakdown {
  typeLabel: string;
  count: number;
  totalSize: number;
}

export interface AnalyticsData {
  storageUsed: number;
  storageLimit: number;
  filesCount: number;
  foldersCount: number;
  largestFiles: FileStats[];
  mostDownloaded: FileStats[];
  storageByType: TypeBreakdown[];
  recentActivity: ActivityItem[];
}
