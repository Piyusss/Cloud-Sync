import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Upload, FolderOpen, Download, Trash2, X,
  CheckCircle, AlertCircle, Loader2,
  FolderPlus, ChevronRight, Home, Folder, History, RotateCcw,
  Link, Copy, Check, Plus, Pencil, Eye, FolderInput,
} from 'lucide-react';
import { fileApi, folderApi, versionApi, shareApi } from '../api';
import { chunkedUpload } from '../utils/chunkedUpload';
import type { FileItem, FileVersion, FolderItem, ShareLink } from '../types';
import { formatBytes, formatRelativeDate, triggerUrlDownload } from '../utils/format';
import { FileIcon } from '../components/FileIcon';

// ─── types ────────────────────────────────────────────────────────────────────

interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'done' | 'error' | 'cancelled';
  error?: string;
  controller: AbortController;
}

// ─── component ────────────────────────────────────────────────────────────────

export function FilesPage() {
  const { folderId } = useParams<{ folderId?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ── upload state ────────────────────────────────────────────────────────────
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── new folder state ─────────────────────────────────────────────────────────
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const newFolderInputRef = useRef<HTMLInputElement>(null);

  // ── delete confirms ──────────────────────────────────────────────────────────
  const [deleteFolderConfirm, setDeleteFolderConfirm] = useState<string | null>(null);
  const [deleteFileConfirm, setDeleteFileConfirm] = useState<string | null>(null);

  // ── rename state ─────────────────────────────────────────────────────────────
  const [renameFile, setRenameFile] = useState<{ id: string; value: string } | null>(null);
  const [renameFolder, setRenameFolder] = useState<{ id: string; value: string } | null>(null);
  const renameFileInputRef = useRef<HTMLInputElement>(null);
  const renameFolderInputRef = useRef<HTMLInputElement>(null);

  // ── move state ────────────────────────────────────────────────────────────────
  const [moveFile, setMoveFile] = useState<FileItem | null>(null);

  // ── preview state ─────────────────────────────────────────────────────────────
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // ── version history ───────────────────────────────────────────────────────────
  const [versionFile, setVersionFile] = useState<FileItem | null>(null);

  // ── share ─────────────────────────────────────────────────────────────────────
  const [shareFile, setShareFile] = useState<FileItem | null>(null);
  const [shareFormPassword, setShareFormPassword] = useState('');
  const [shareFormExpiry, setShareFormExpiry] = useState<number | null>(null);
  const [showShareForm, setShowShareForm] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // ── queries ──────────────────────────────────────────────────────────────────
  const foldersQuery = useQuery({
    queryKey: ['folders', folderId ?? 'root'],
    queryFn: () => folderApi.list(folderId).then((r) => r.data),
  });

  const filesQuery = useQuery({
    queryKey: ['files', folderId ?? 'root'],
    queryFn: () => fileApi.list(folderId).then((r) => r.data),
  });

  const breadcrumbQuery = useQuery({
    queryKey: ['breadcrumb', folderId],
    queryFn: () => folderApi.breadcrumb(folderId!).then((r) => r.data),
    enabled: !!folderId,
  });

  const allFoldersQuery = useQuery({
    queryKey: ['folders-all'],
    queryFn: () => folderApi.listAll().then((r) => r.data),
    enabled: !!moveFile,
  });

  const folders: FolderItem[] = foldersQuery.data ?? [];
  const files: FileItem[] = filesQuery.data ?? [];
  const breadcrumb: FolderItem[] = breadcrumbQuery.data ?? [];
  const isLoading = foldersQuery.isLoading || filesQuery.isLoading;

  // ── focus effects ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (showNewFolder) newFolderInputRef.current?.focus();
  }, [showNewFolder]);

  useEffect(() => {
    if (renameFile) renameFileInputRef.current?.focus();
  }, [renameFile]);

  useEffect(() => {
    if (renameFolder) renameFolderInputRef.current?.focus();
  }, [renameFolder]);

  // ── preview load effect ───────────────────────────────────────────────────────
  useEffect(() => {
    let objectUrl: string | null = null;

    if (!previewFile) {
      setPreviewUrl(null);
      setPreviewText(null);
      setPreviewLoading(false);
      return;
    }

    const ct = previewFile.contentType;
    const isPreviewable =
      ct.startsWith('image/') ||
      ct === 'application/pdf' ||
      ct.startsWith('video/') ||
      ct.startsWith('audio/') ||
      ct.startsWith('text/');

    if (!isPreviewable) return;

    setPreviewLoading(true);
    fileApi.download(previewFile.id)
      .then((res) => fetch(res.data.url))
      .then((r) => r.blob())
      .then((blob) => {
        if (ct.startsWith('text/')) {
          blob.text().then((text) => {
            setPreviewText(text);
            setPreviewLoading(false);
          });
        } else {
          objectUrl = URL.createObjectURL(blob);
          setPreviewUrl(objectUrl);
          setPreviewLoading(false);
        }
      })
      .catch(() => setPreviewLoading(false));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [previewFile?.id]);

  // ── mutations ────────────────────────────────────────────────────────────────
  const createFolderMutation = useMutation({
    mutationFn: (name: string) =>
      folderApi.create({ name, parentFolderId: folderId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      setNewFolderName('');
      setShowNewFolder(false);
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (id: string) => folderApi.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['folders', folderId ?? 'root'] });
      const previous = queryClient.getQueryData<FolderItem[]>(['folders', folderId ?? 'root']);
      queryClient.setQueryData<FolderItem[]>(['folders', folderId ?? 'root'], (old) =>
        old?.filter((f) => f.id !== id) ?? []
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(['folders', folderId ?? 'root'], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      setDeleteFolderConfirm(null);
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: (id: string) => fileApi.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['files', folderId ?? 'root'] });
      const previous = queryClient.getQueryData<FileItem[]>(['files', folderId ?? 'root']);
      queryClient.setQueryData<FileItem[]>(['files', folderId ?? 'root'], (old) =>
        old?.filter((f) => f.id !== id) ?? []
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(['files', folderId ?? 'root'], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      setDeleteFileConfirm(null);
    },
  });

  const renameFileMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => fileApi.rename(id, name),
    onMutate: async ({ id, name }) => {
      await queryClient.cancelQueries({ queryKey: ['files', folderId ?? 'root'] });
      const previous = queryClient.getQueryData<FileItem[]>(['files', folderId ?? 'root']);
      queryClient.setQueryData<FileItem[]>(['files', folderId ?? 'root'], (old) =>
        old?.map((f) => (f.id === id ? { ...f, name } : f)) ?? []
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['files', folderId ?? 'root'], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      setRenameFile(null);
    },
  });

  const renameFolderMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => folderApi.rename(id, name),
    onMutate: async ({ id, name }) => {
      await queryClient.cancelQueries({ queryKey: ['folders', folderId ?? 'root'] });
      const previous = queryClient.getQueryData<FolderItem[]>(['folders', folderId ?? 'root']);
      queryClient.setQueryData<FolderItem[]>(['folders', folderId ?? 'root'], (old) =>
        old?.map((f) => (f.id === id ? { ...f, name } : f)) ?? []
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['folders', folderId ?? 'root'], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      setRenameFolder(null);
    },
  });

  const moveFileMutation = useMutation({
    mutationFn: ({ id, targetFolderId }: { id: string; targetFolderId: string | null }) =>
      fileApi.move(id, targetFolderId),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ['files', folderId ?? 'root'] });
      const previous = queryClient.getQueryData<FileItem[]>(['files', folderId ?? 'root']);
      queryClient.setQueryData<FileItem[]>(['files', folderId ?? 'root'], (old) =>
        old?.filter((f) => f.id !== id) ?? []
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['files', folderId ?? 'root'], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      setMoveFile(null);
    },
  });

  // ── upload ───────────────────────────────────────────────────────────────────
  const handleFiles = useCallback(
    (selectedFiles: File[]) => {
      const items: UploadItem[] = selectedFiles.map((file) => ({
        id: crypto.randomUUID(),
        file,
        progress: 0,
        status: 'uploading' as const,
        controller: new AbortController(),
      }));

      setUploads((prev) => [...prev, ...items]);

      items.forEach((item) => {
        chunkedUpload(
          item.file,
          folderId,
          (progress) =>
            setUploads((prev) =>
              prev.map((u) => (u.id === item.id ? { ...u, progress } : u))
            ),
          item.controller.signal
        )
          .then(() => {
            setUploads((prev) =>
              prev.map((u) =>
                u.id === item.id ? { ...u, status: 'done', progress: 100 } : u
              )
            );
            queryClient.invalidateQueries({ queryKey: ['files', folderId ?? 'root'] });
            queryClient.invalidateQueries({ queryKey: ['folders', folderId ?? 'root'] });
            queryClient.invalidateQueries({ queryKey: ['user'] });
            setTimeout(
              () => setUploads((prev) => prev.filter((u) => u.id !== item.id)),
              2500
            );
          })
          .catch((err) => {
            const cancelled =
              err.name === 'CanceledError' || err.code === 'ERR_CANCELED';
            setUploads((prev) =>
              prev.map((u) =>
                u.id === item.id
                  ? {
                      ...u,
                      status: cancelled ? 'cancelled' : 'error',
                      error: cancelled
                        ? undefined
                        : (err.response?.data?.message ?? 'Upload failed'),
                    }
                  : u
              )
            );
            setTimeout(
              () => setUploads((prev) => prev.filter((u) => u.id !== item.id)),
              4000
            );
          });
      });
    },
    [queryClient, folderId]
  );

  const cancelUpload = (id: string) => {
    setUploads((prev) => {
      prev.find((u) => u.id === id)?.controller.abort();
      return prev.map((u) => (u.id === id ? { ...u, status: 'cancelled' as const } : u));
    });
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      handleFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) handleFiles(Array.from(e.dataTransfer.files));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false);
  };

  const handleDownload = async (file: FileItem) => {
    const { data } = await fileApi.download(file.id);
    triggerUrlDownload(data.url);
  };

  const submitNewFolder = () => {
    const name = newFolderName.trim();
    if (name) createFolderMutation.mutate(name);
  };

  // ── share queries / mutations ─────────────────────────────────────────────────
  const sharesQuery = useQuery({
    queryKey: ['shares', shareFile?.id],
    queryFn: () => shareApi.list(shareFile!.id).then((r) => r.data),
    enabled: !!shareFile,
  });

  const createShareMutation = useMutation({
    mutationFn: () =>
      shareApi.create(shareFile!.id, {
        password: shareFormPassword || undefined,
        expiresInHours: shareFormExpiry,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shares', shareFile?.id] });
      setShareFormPassword('');
      setShareFormExpiry(null);
      setShowShareForm(false);
    },
  });

  const revokeShareMutation = useMutation({
    mutationFn: (token: string) => shareApi.revoke(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shares', shareFile?.id] });
    },
  });

  const copyLink = (url: string, token: string) => {
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  // ── version history queries ───────────────────────────────────────────────────
  const versionsQuery = useQuery({
    queryKey: ['versions', versionFile?.id],
    queryFn: () => versionApi.list(versionFile!.id).then((r) => r.data),
    enabled: !!versionFile,
  });

  const restoreMutation = useMutation({
    mutationFn: ({ fileId, versionId }: { fileId: string; versionId: string }) =>
      versionApi.restore(fileId, versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['files-all'] });
      queryClient.invalidateQueries({ queryKey: ['versions', versionFile?.id] });
    },
  });

  const deleteVersionMutation = useMutation({
    mutationFn: ({ fileId, versionId }: { fileId: string; versionId: string }) =>
      versionApi.delete(fileId, versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['versions', versionFile?.id] });
    },
  });

  const activeUploads = uploads.filter((u) => u.status === 'uploading');
  const isEmpty = folders.length === 0 && files.length === 0;

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Files</h1>
          <p className="text-surface-400 mt-0.5 text-sm">
            {isLoading ? 'Loading…' : `${folders.length} folder${folders.length !== 1 ? 's' : ''}, ${files.length} file${files.length !== 1 ? 's' : ''}`}
            {activeUploads.length > 0 && (
              <span className="ml-2 text-brand-400">· {activeUploads.length} uploading</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowNewFolder(true); setDeleteFolderConfirm(null); }}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <FolderPlus className="w-4 h-4" />
            <span className="hidden sm:inline">New Folder</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Upload</span>
          </button>
        </div>
      </div>

      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileInput} />

      {/* ── Breadcrumb ─────────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-1 text-sm flex-wrap">
        <button
          onClick={() => navigate('/files')}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors ${
            !folderId
              ? 'text-white font-medium bg-surface-800/50'
              : 'text-surface-400 hover:text-white hover:bg-surface-800/40'
          }`}
        >
          <Home className="w-3.5 h-3.5" />
          Root
        </button>

        {breadcrumb.map((crumb, i) => (
          <span key={crumb.id} className="flex items-center gap-1">
            <ChevronRight className="w-3.5 h-3.5 text-surface-600" />
            <button
              onClick={() => navigate(`/files/${crumb.id}`)}
              className={`px-2 py-1 rounded-lg transition-colors ${
                i === breadcrumb.length - 1
                  ? 'text-white font-medium bg-surface-800/50'
                  : 'text-surface-400 hover:text-white hover:bg-surface-800/40'
              }`}
            >
              {crumb.name}
            </button>
          </span>
        ))}
      </nav>

      {/* ── Drop Zone ──────────────────────────────────────────────────────── */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg px-8 py-7 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-brand-500 bg-brand-500/10'
            : 'border-surface-700 hover:border-surface-600 bg-surface-900/20'
        }`}
      >
        <Upload className={`w-8 h-8 mx-auto mb-2 transition-colors ${isDragging ? 'text-brand-400' : 'text-surface-600'}`} />
        <p className={`text-sm font-medium transition-colors ${isDragging ? 'text-brand-300' : 'text-surface-400'}`}>
          {isDragging ? 'Drop files here' : 'Drag & drop, or click to upload'}
        </p>
        <p className="text-xs text-surface-600 mt-0.5">Any file type · Max 2 GB</p>
      </div>

      {/* ── Upload Queue ───────────────────────────────────────────────────── */}
      {uploads.length > 0 && (
        <div className="glass-card p-4 space-y-2">
          <p className="text-xs font-medium text-surface-500 uppercase tracking-wider mb-3">Transfers</p>
          {uploads.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-800/40">
              <FileIcon contentType={item.file.type || 'application/octet-stream'} className="w-5 h-5 shrink-0 text-surface-400" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-white truncate pr-2">{item.file.name}</span>
                  <span className="text-xs text-surface-500 shrink-0">
                    {item.status === 'uploading' && (item.progress < 0 ? 'Hashing…' : `${item.progress}%`)}
                    {item.status === 'done' && <span className="text-surface-100">Done</span>}
                    {item.status === 'error' && <span className="text-surface-400">Failed</span>}
                    {item.status === 'cancelled' && <span className="text-surface-500">Cancelled</span>}
                  </span>
                </div>
                {item.status === 'uploading' && item.progress < 0 && (
                  <p className="text-xs text-surface-500">Computing hash…</p>
                )}
                {item.status === 'uploading' && item.progress >= 0 && (
                  <div className="w-full h-1 bg-surface-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-300"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}
                {item.status === 'error' && <p className="text-xs text-surface-400">{item.error}</p>}
              </div>
              <div className="shrink-0">
                {item.status === 'uploading' && (
                  <button onClick={() => cancelUpload(item.id)} className="p-1 text-surface-500 hover:text-white rounded transition-colors" title="Cancel">
                    <X className="w-4 h-4" />
                  </button>
                )}
                {item.status === 'done' && <CheckCircle className="w-4 h-4 text-surface-100" />}
                {item.status === 'error' && <AlertCircle className="w-4 h-4 text-surface-400" />}
                {item.status === 'cancelled' && <X className="w-4 h-4 text-surface-600" />}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── New Folder Inline Form ─────────────────────────────────────────── */}
      {showNewFolder && (
        <div className="glass-card p-4">
          <p className="text-xs font-medium text-surface-500 uppercase tracking-wider mb-3">New Folder</p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Folder className="w-5 h-5 text-surface-300 shrink-0" />
              <input
                ref={newFolderInputRef}
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitNewFolder();
                  if (e.key === 'Escape') { setShowNewFolder(false); setNewFolderName(''); }
                }}
                placeholder="Folder name"
                className="flex-1 min-w-0 bg-surface-800 border border-surface-600 rounded-xl px-3 py-2 text-sm text-white placeholder-surface-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50"
              />
            </div>
            <div className="flex items-center gap-2 sm:shrink-0">
              <button
                onClick={submitNewFolder}
                disabled={!newFolderName.trim() || createFolderMutation.isPending}
                className="btn-primary text-sm px-4 py-2 disabled:opacity-50 flex-1 sm:flex-none"
              >
                {createFolderMutation.isPending ? 'Creating…' : 'Create'}
              </button>
              <button
                onClick={() => { setShowNewFolder(false); setNewFolderName(''); }}
                className="p-2 text-surface-500 hover:text-white rounded-lg hover:bg-surface-700 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          {createFolderMutation.isError && (
            <p className="text-xs text-surface-400 mt-2 ml-7">
              {(createFolderMutation.error as Error)?.message ?? 'Failed to create folder'}
            </p>
          )}
        </div>
      )}

      {/* ── Main Content ───────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="glass-card flex items-center justify-center py-20">
          <Loader2 className="w-7 h-7 text-surface-500 animate-spin" />
        </div>
      ) : isEmpty ? (
        <div className="glass-card flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-2xl bg-surface-800/50 flex items-center justify-center mb-4">
            <FolderOpen className="w-10 h-10 text-surface-600" />
          </div>
          <p className="text-lg font-medium text-surface-300">This folder is empty</p>
          <p className="text-sm text-surface-500 mt-1">Upload files or create a sub-folder</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-700/50">
                <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-5 py-3.5">Name</th>
                <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-5 py-3.5 hidden sm:table-cell">Size / Items</th>
                <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-5 py-3.5 hidden md:table-cell">Created</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody>

              {/* ── Folder rows ────────────────────────────────────────────── */}
              {folders.map((folder, i) => (
                <tr
                  key={folder.id}
                  className={`group hover:bg-surface-800/40 transition-colors ${
                    i < folders.length - 1 || files.length > 0 ? 'border-b border-surface-800/60' : ''
                  }`}
                >
                  <td className="px-5 py-3.5 min-w-0">
                    {renameFolder?.id === folder.id ? (
                      <div className="flex items-center gap-2">
                        <Folder className="w-5 h-5 text-surface-300 shrink-0" />
                        <input
                          ref={renameFolderInputRef}
                          type="text"
                          value={renameFolder.value}
                          onChange={(e) => setRenameFolder({ ...renameFolder, value: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && renameFolder.value.trim()) {
                              renameFolderMutation.mutate({ id: folder.id, name: renameFolder.value.trim() });
                            }
                            if (e.key === 'Escape') setRenameFolder(null);
                          }}
                          onBlur={() => {
                            if (renameFolder.value.trim() && renameFolder.value !== folder.name && !renameFolderMutation.isPending) {
                              renameFolderMutation.mutate({ id: folder.id, name: renameFolder.value.trim() });
                            } else if (!renameFolderMutation.isPending) {
                              setRenameFolder(null);
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 min-w-0 bg-surface-800 border border-surface-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-brand-500"
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => navigate(`/files/${folder.id}`)}
                        className="flex items-center gap-3 text-left hover:text-white transition-colors group/btn w-full min-w-0"
                      >
                        <Folder className="w-5 h-5 text-surface-300 shrink-0" />
                        <span className="text-sm text-surface-200 group-hover/btn:text-white font-medium truncate">
                          {folder.name}
                        </span>
                      </button>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-surface-500 hidden sm:table-cell">
                    {folder.itemCount ?? 0} file{(folder.itemCount ?? 0) !== 1 ? 's' : ''}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-surface-500 hidden md:table-cell">
                    {formatRelativeDate(folder.createdAt)}
                  </td>
                  <td className="px-5 py-3.5 shrink-0">
                    <div className="flex items-center justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      {deleteFolderConfirm === folder.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => deleteFolderMutation.mutate(folder.id)}
                            disabled={deleteFolderMutation.isPending}
                            className="text-xs text-surface-200 hover:text-white px-2.5 py-1 bg-surface-700 hover:bg-surface-600 rounded-lg transition-colors"
                          >
                            {deleteFolderMutation.isPending ? 'Deleting…' : 'Delete'}
                          </button>
                          <button
                            onClick={() => setDeleteFolderConfirm(null)}
                            className="text-xs text-surface-500 hover:text-surface-300 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => setRenameFolder({ id: folder.id, value: folder.name })}
                            className="p-2 rounded-lg text-surface-500 hover:text-surface-300 hover:bg-surface-700/50 transition-colors"
                            title="Rename folder"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteFolderConfirm(folder.id)}
                            className="p-2 rounded-lg text-surface-500 hover:text-white hover:bg-surface-700/50 transition-colors"
                            title="Delete folder"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {/* ── File rows ──────────────────────────────────────────────── */}
              {files.map((file, i) => (
                <tr
                  key={file.id}
                  className={`group hover:bg-surface-800/40 transition-colors ${
                    i < files.length - 1 ? 'border-b border-surface-800/60' : ''
                  }`}
                >
                  <td className="px-5 py-3.5 min-w-0">
                    {renameFile?.id === file.id ? (
                      <div className="flex items-center gap-2">
                        <FileIcon contentType={file.contentType} className="w-5 h-5 shrink-0 text-surface-400" />
                        <input
                          ref={renameFileInputRef}
                          type="text"
                          value={renameFile.value}
                          onChange={(e) => setRenameFile({ ...renameFile, value: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && renameFile.value.trim()) {
                              renameFileMutation.mutate({ id: file.id, name: renameFile.value.trim() });
                            }
                            if (e.key === 'Escape') setRenameFile(null);
                          }}
                          onBlur={() => {
                            if (renameFile.value.trim() && renameFile.value !== file.name && !renameFileMutation.isPending) {
                              renameFileMutation.mutate({ id: file.id, name: renameFile.value.trim() });
                            } else if (!renameFileMutation.isPending) {
                              setRenameFile(null);
                            }
                          }}
                          className="flex-1 min-w-0 bg-surface-800 border border-surface-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-brand-500"
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => setPreviewFile(file)}
                        className="flex items-center gap-3 text-left hover:text-white transition-colors group/btn w-full min-w-0"
                        title="Preview"
                      >
                        <FileIcon contentType={file.contentType} className="w-5 h-5 shrink-0 text-surface-400" />
                        <span className="text-sm text-surface-200 group-hover/btn:text-white truncate">{file.name}</span>
                      </button>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-surface-500 hidden sm:table-cell">
                    {formatBytes(file.size)}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-surface-500 hidden md:table-cell">
                    {formatRelativeDate(file.createdAt)}
                  </td>
                  <td className="px-5 py-3.5 shrink-0">
                    <div className="flex items-center justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setPreviewFile(file)}
                        className="p-2 rounded-lg text-surface-500 hover:text-surface-300 hover:bg-surface-700/50 transition-colors"
                        title="Preview"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setRenameFile({ id: file.id, value: file.name })}
                        className="p-2 rounded-lg text-surface-500 hover:text-surface-300 hover:bg-surface-700/50 transition-colors"
                        title="Rename"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setMoveFile(file)}
                        className="p-2 rounded-lg text-surface-500 hover:text-surface-300 hover:bg-surface-700/50 transition-colors"
                        title="Move to folder"
                      >
                        <FolderInput className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setVersionFile(file)}
                        className="p-2 rounded-lg text-surface-500 hover:text-surface-300 hover:bg-surface-700/50 transition-colors"
                        title="Version history"
                      >
                        <History className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setShareFile(file); setShowShareForm(false); }}
                        className="p-2 rounded-lg text-surface-500 hover:text-brand-400 hover:bg-surface-700/50 transition-colors"
                        title="Share"
                      >
                        <Link className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDownload(file)}
                        className="p-2 rounded-lg text-surface-500 hover:text-brand-400 hover:bg-surface-700/50 transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      {deleteFileConfirm === file.id ? (
                        <div className="flex items-center gap-1 ml-1">
                          <button
                            onClick={() => deleteFileMutation.mutate(file.id)}
                            disabled={deleteFileMutation.isPending}
                            className="text-xs text-surface-200 hover:text-white px-2.5 py-1 bg-surface-700 hover:bg-surface-600 rounded-lg transition-colors"
                          >
                            {deleteFileMutation.isPending ? 'Deleting…' : 'Delete'}
                          </button>
                          <button
                            onClick={() => setDeleteFileConfirm(null)}
                            className="text-xs text-surface-500 hover:text-surface-300 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteFileConfirm(file.id)}
                          className="p-2 rounded-lg text-surface-500 hover:text-white hover:bg-surface-700/50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

            </tbody>
          </table>
        </div>
      )}

      {/* ── Preview Modal ──────────────────────────────────────────────── */}
      {previewFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="w-full max-w-3xl bg-surface-900 border border-surface-700 rounded-lg shadow-xl mx-4 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-800 shrink-0">
              <div className="min-w-0 flex items-center gap-3">
                <FileIcon contentType={previewFile.contentType} className="w-5 h-5 text-surface-400 shrink-0" />
                <p className="text-sm font-medium text-white truncate">{previewFile.name}</p>
                <span className="text-xs text-surface-500 shrink-0">{formatBytes(previewFile.size)}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-3">
                <button
                  onClick={() => handleDownload(previewFile)}
                  className="p-1.5 rounded text-surface-500 hover:text-white hover:bg-surface-800 transition-colors"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="p-1.5 rounded text-surface-500 hover:text-white hover:bg-surface-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-[300px]">
              {previewLoading ? (
                <Loader2 className="w-6 h-6 text-surface-500 animate-spin" />
              ) : previewFile.contentType.startsWith('image/') && previewUrl ? (
                <img
                  src={previewUrl}
                  alt={previewFile.name}
                  className="max-w-full max-h-[70vh] object-contain rounded"
                />
              ) : previewFile.contentType === 'application/pdf' && previewUrl ? (
                <iframe
                  src={previewUrl}
                  className="w-full rounded border-0"
                  style={{ height: '70vh' }}
                  title={previewFile.name}
                />
              ) : previewFile.contentType.startsWith('video/') && previewUrl ? (
                <video src={previewUrl} controls className="max-w-full max-h-[70vh] rounded" />
              ) : previewFile.contentType.startsWith('audio/') && previewUrl ? (
                <audio src={previewUrl} controls className="w-full" />
              ) : previewText !== null ? (
                <pre className="text-xs text-surface-300 font-mono whitespace-pre-wrap max-w-full overflow-auto w-full text-left" style={{ maxHeight: '70vh' }}>
                  {previewText}
                </pre>
              ) : (
                <div className="text-center">
                  <FileIcon contentType={previewFile.contentType} className="w-12 h-12 text-surface-600 mx-auto mb-3" />
                  <p className="text-surface-400 text-sm">No preview available</p>
                  <button
                    onClick={() => handleDownload(previewFile)}
                    className="mt-3 btn-primary text-sm px-4 py-2 inline-flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Move Modal ─────────────────────────────────────────────────── */}
      {moveFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm bg-surface-900 border border-surface-700 rounded-lg shadow-xl mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-800">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">Move File</p>
                <p className="text-xs text-surface-500 truncate mt-0.5">{moveFile.name}</p>
              </div>
              <button
                onClick={() => setMoveFile(null)}
                className="p-1.5 rounded text-surface-500 hover:text-white hover:bg-surface-800 transition-colors ml-3 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto py-1">
              {allFoldersQuery.isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 text-surface-500 animate-spin" />
                </div>
              ) : (
                <>
                  <button
                    onClick={() => moveFileMutation.mutate({ id: moveFile.id, targetFolderId: null })}
                    disabled={moveFile.folderId === null || moveFileMutation.isPending}
                    className={`w-full flex items-center gap-3 px-5 py-3 text-sm transition-colors ${
                      moveFile.folderId === null
                        ? 'text-surface-600 cursor-not-allowed'
                        : 'text-surface-300 hover:text-white hover:bg-surface-800/60'
                    }`}
                  >
                    <Home className="w-4 h-4 shrink-0" />
                    Root
                    {moveFile.folderId === null && (
                      <span className="text-xs text-surface-600 ml-auto">current</span>
                    )}
                  </button>

                  {(allFoldersQuery.data ?? [])
                    .filter((f) => f.id !== moveFile.folderId)
                    .map((folder) => (
                      <button
                        key={folder.id}
                        onClick={() => moveFileMutation.mutate({ id: moveFile.id, targetFolderId: folder.id })}
                        disabled={moveFileMutation.isPending}
                        className="w-full flex items-center gap-3 px-5 py-3 text-sm text-surface-300 hover:text-white hover:bg-surface-800/60 transition-colors"
                      >
                        <Folder className="w-4 h-4 shrink-0 text-surface-400" />
                        <span className="truncate">{folder.name}</span>
                      </button>
                    ))}
                </>
              )}
            </div>

            {moveFileMutation.isError && (
              <p className="text-xs text-surface-400 px-5 pb-3">
                {(moveFileMutation.error as Error)?.message ?? 'Failed to move file'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Version History Modal ──────────────────────────────────────── */}
      {versionFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md bg-surface-900 border border-surface-700 rounded-lg shadow-xl mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-800">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">Version History</p>
                <p className="text-xs text-surface-500 truncate mt-0.5">{versionFile.name}</p>
              </div>
              <button
                onClick={() => setVersionFile(null)}
                className="p-1.5 rounded text-surface-500 hover:text-white hover:bg-surface-800 transition-colors ml-3 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {versionsQuery.isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 text-surface-500 animate-spin" />
                </div>
              ) : (versionsQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-surface-500 text-center py-8">No versions found</p>
              ) : (
                (versionsQuery.data as FileVersion[]).map((v, i) => (
                  <div
                    key={v.id}
                    className={`flex items-center gap-3 px-5 py-3.5 ${
                      i < (versionsQuery.data?.length ?? 0) - 1 ? 'border-b border-surface-800' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-surface-200">v{v.version}</span>
                        {v.current && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-brand-600/20 text-brand-400 border border-brand-600/30">
                            current
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-surface-500 mt-0.5">
                        {(v.size / 1024).toFixed(1)} KB ·{' '}
                        {new Date(v.createdAt).toLocaleString()}
                      </p>
                    </div>

                    {!v.current && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => restoreMutation.mutate({ fileId: versionFile.id, versionId: v.id })}
                          disabled={restoreMutation.isPending}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs text-brand-400 hover:bg-brand-600/10 transition-colors"
                          title="Restore this version"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Restore
                        </button>
                        <button
                          onClick={() => deleteVersionMutation.mutate({ fileId: versionFile.id, versionId: v.id })}
                          disabled={deleteVersionMutation.isPending}
                          className="p-1.5 rounded text-surface-500 hover:text-white hover:bg-surface-700/50 transition-colors"
                          title="Delete this version"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Share Modal ───────────────────────────────────────────────── */}
      {shareFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md bg-surface-900 border border-surface-700 rounded-lg shadow-xl mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-800">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">Share File</p>
                <p className="text-xs text-surface-500 truncate mt-0.5">{shareFile.name}</p>
              </div>
              <button
                onClick={() => { setShareFile(null); setShowShareForm(false); }}
                className="p-1.5 rounded text-surface-500 hover:text-white hover:bg-surface-800 transition-colors ml-3 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto">
              {sharesQuery.isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 text-surface-500 animate-spin" />
                </div>
              ) : (sharesQuery.data ?? []).length === 0 && !showShareForm ? (
                <p className="text-sm text-surface-500 text-center py-6">No share links yet.</p>
              ) : (
                (sharesQuery.data as ShareLink[] ?? []).map((link, i) => (
                  <div
                    key={link.id}
                    className={`px-5 py-3.5 ${
                      i < (sharesQuery.data?.length ?? 0) - 1 ? 'border-b border-surface-800' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="flex-1 text-xs text-surface-300 truncate font-mono">
                        {link.url}
                      </span>
                      <button
                        onClick={() => copyLink(link.url, link.token)}
                        className="shrink-0 p-1.5 rounded text-surface-500 hover:text-white hover:bg-surface-700 transition-colors"
                        title="Copy link"
                      >
                        {copiedToken === link.token
                          ? <Check className="w-3.5 h-3.5 text-surface-100" />
                          : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => revokeShareMutation.mutate(link.token)}
                        disabled={revokeShareMutation.isPending}
                        className="shrink-0 p-1.5 rounded text-surface-500 hover:text-white hover:bg-surface-700/50 transition-colors"
                        title="Revoke link"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-surface-600">
                      {link.hasPassword ? 'Password protected · ' : ''}
                      {link.expiresAt
                        ? `Expires ${new Date(link.expiresAt).toLocaleDateString()}`
                        : 'Never expires'}{' '}
                      · {link.downloadCount} download{link.downloadCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                ))
              )}
            </div>

            {showShareForm ? (
              <div className="px-5 py-4 border-t border-surface-800 space-y-3">
                <div>
                  <label className="block text-xs text-surface-500 mb-1">
                    Password <span className="text-surface-600">(optional)</span>
                  </label>
                  <input
                    type="password"
                    value={shareFormPassword}
                    onChange={(e) => setShareFormPassword(e.target.value)}
                    placeholder="Leave blank for public link"
                    className="w-full bg-surface-800 border border-surface-700 rounded px-3 py-2 text-sm text-white placeholder-surface-600 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-surface-500 mb-1">Expires in</label>
                  <select
                    value={shareFormExpiry ?? ''}
                    onChange={(e) =>
                      setShareFormExpiry(e.target.value ? Number(e.target.value) : null)
                    }
                    className="w-full bg-surface-800 border border-surface-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="">Never</option>
                    <option value="1">1 hour</option>
                    <option value="24">24 hours</option>
                    <option value="168">7 days</option>
                    <option value="720">30 days</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => createShareMutation.mutate()}
                    disabled={createShareMutation.isPending}
                    className="btn-primary text-sm px-4 py-2 flex-1"
                  >
                    {createShareMutation.isPending ? 'Creating…' : 'Create Link'}
                  </button>
                  <button
                    onClick={() => setShowShareForm(false)}
                    className="px-3 py-2 text-sm text-surface-500 hover:text-white rounded transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                {createShareMutation.isError && (
                  <p className="text-xs text-surface-400">
                    {(createShareMutation.error as Error)?.message ?? 'Failed to create link'}
                  </p>
                )}
              </div>
            ) : (
              <div className="px-5 py-3 border-t border-surface-800">
                <button
                  onClick={() => setShowShareForm(true)}
                  className="flex items-center gap-2 text-sm text-brand-400 hover:text-brand-300 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create new link
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
