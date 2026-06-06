import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Trash2, RotateCcw, Loader2, AlertTriangle,
} from 'lucide-react';
import { trashApi } from '../api';
import type { TrashItem } from '../types';
import { formatBytes, formatRelativeDate } from '../utils/format';
import { FileIcon } from '../components/FileIcon';

// ── helpers ───────────────────────────────────────────────────────────────────

function daysLeft(deletedAt: string): number {
  const deleted = new Date(deletedAt).getTime();
  const expiresAt = deleted + 30 * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / (24 * 60 * 60 * 1000)));
}

// ── component ─────────────────────────────────────────────────────────────────

export function TrashPage() {
  const queryClient = useQueryClient();
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['trash'],
    queryFn: () => trashApi.list().then((r) => r.data),
  });

  const restoreMutation = useMutation({
    mutationFn: (fileId: string) => trashApi.restore(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (fileId: string) => trashApi.delete(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      setConfirmDelete(null);
    },
  });

  const emptyMutation = useMutation({
    mutationFn: () => trashApi.empty(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      setConfirmEmpty(false);
    },
  });

  return (
    <div className="animate-fade-in space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Trash</h1>
          <p className="text-surface-400 mt-0.5 text-sm">
            Files are permanently deleted after 30 days
          </p>
        </div>
        {items.length > 0 && (
          <div>
            {confirmEmpty ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-surface-400">Delete all permanently?</span>
                <button
                  onClick={() => emptyMutation.mutate()}
                  disabled={emptyMutation.isPending}
                  className="text-xs text-surface-200 hover:text-white px-2.5 py-1 bg-surface-700 hover:bg-surface-600 rounded transition-colors"
                >
                  {emptyMutation.isPending ? 'Emptying…' : 'Yes, empty'}
                </button>
                <button
                  onClick={() => setConfirmEmpty(false)}
                  className="text-xs text-surface-500 hover:text-surface-300 px-2.5 py-1 rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmEmpty(true)}
                className="flex items-center gap-2 text-sm text-surface-300 hover:text-white px-3 py-2 rounded-md border border-surface-700 hover:bg-surface-800 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Empty Trash
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="glass-card flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-surface-500 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-surface-800 rounded-lg flex items-center justify-center mb-4">
            <Trash2 className="w-8 h-8 text-surface-600" />
          </div>
          <p className="text-surface-300 font-medium">Trash is empty</p>
          <p className="text-surface-500 text-sm mt-1">Deleted files will appear here for 30 days</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-700/50">
                <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-5 py-3">Name</th>
                <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-5 py-3 hidden sm:table-cell">Location</th>
                <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-5 py-3 hidden sm:table-cell">Size</th>
                <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Deleted</th>
                <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Expires</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {(items as TrashItem[]).map((item, i) => {
                const days = daysLeft(item.deletedAt);
                return (
                  <tr
                    key={item.id}
                    className={`group hover:bg-surface-800/40 transition-colors ${
                      i < items.length - 1 ? 'border-b border-surface-800/60' : ''
                    }`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileIcon contentType={item.contentType} />
                        <span className="text-sm text-surface-400 truncate line-through decoration-surface-600">
                          {item.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-surface-600 hidden sm:table-cell">
                      {item.folderName ?? 'Root'}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-surface-500 hidden sm:table-cell">
                      {formatBytes(item.size)}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-surface-500 hidden md:table-cell">
                      {formatRelativeDate(item.deletedAt)}
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          days <= 3
                            ? 'text-white bg-surface-800 border border-surface-600 font-medium'
                            : days <= 7
                            ? 'text-surface-300 bg-surface-800'
                            : 'text-surface-500 bg-surface-800/60'
                        }`}
                      >
                        {days === 0 ? 'Today' : `${days}d left`}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        {/* Restore */}
                        <button
                          onClick={() => restoreMutation.mutate(item.id)}
                          disabled={restoreMutation.isPending}
                          className="p-2 rounded-lg text-surface-500 hover:text-white hover:bg-surface-700/50 transition-colors"
                          title="Restore"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>

                        {/* Permanent delete */}
                        {confirmDelete === item.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => deleteMutation.mutate(item.id)}
                              disabled={deleteMutation.isPending}
                              className="text-xs text-surface-200 hover:text-white px-2.5 py-1 bg-surface-700 hover:bg-surface-600 rounded transition-colors"
                            >
                              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="text-xs text-surface-500 px-2 py-1 rounded transition-colors hover:text-surface-300"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(item.id)}
                            className="p-2 rounded-lg text-surface-500 hover:text-white hover:bg-surface-700/50 transition-colors"
                            title="Delete permanently"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Footer note */}
          <div className="px-5 py-3 border-t border-surface-800 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-surface-600" />
            <p className="text-xs text-surface-600">
              Files are permanently deleted 30 days after being moved to trash.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
