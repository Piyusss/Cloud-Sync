import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Share2, Link as LinkIcon, Copy, Check, Trash2, Lock, Loader2,
} from 'lucide-react';
import { shareApi } from '../api';
import type { ShareLink } from '../types';
import { formatBytes, formatRelativeDate } from '../utils/format';
import { FileIcon } from '../components/FileIcon';

function isExpired(link: ShareLink): boolean {
  return !!link.expiresAt && new Date(link.expiresAt).getTime() < Date.now();
}

export function SharedPage() {
  const queryClient = useQueryClient();
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);

  const { data: links = [], isLoading } = useQuery({
    queryKey: ['shares-all'],
    queryFn: () => shareApi.listAll().then((r) => r.data),
  });

  const revokeMutation = useMutation({
    mutationFn: (token: string) => shareApi.revoke(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shares-all'] });
      setConfirmRevoke(null);
    },
  });

  const copyLink = (url: string, token: string) => {
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  return (
    <div className="animate-fade-in space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Shared</h1>
        <p className="text-surface-400 mt-0.5 text-sm">
          Public links you've generated. Anyone with a link can access the file
          {links.length > 0 ? ` · ${links.length} active` : ''}.
        </p>
      </div>

      {isLoading ? (
        <div className="glass-card flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-surface-500 animate-spin" />
        </div>
      ) : links.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-20 text-center px-4">
          <div className="w-16 h-16 bg-surface-800 rounded-lg flex items-center justify-center mb-4">
            <Share2 className="w-8 h-8 text-surface-600" />
          </div>
          <p className="text-surface-300 font-medium">No shared links yet</p>
          <p className="text-surface-500 text-sm mt-1">
            Open a file's share menu in <span className="text-surface-300">My Files</span> to create a public link.
          </p>
        </div>
      ) : (
        <div className="glass-card divide-y divide-surface-800/70">
          {(links as ShareLink[]).map((link) => {
            const expired = isExpired(link);
            return (
              <div key={link.id} className="px-4 sm:px-5 py-4">
                {/* File row */}
                <div className="flex items-center gap-3 mb-2.5 min-w-0">
                  <FileIcon contentType={link.contentType ?? ''} />
                  <span className="text-sm text-surface-200 truncate flex-1 min-w-0">
                    {link.fileName ?? 'Untitled'}
                  </span>
                  <span className="text-xs text-surface-600 shrink-0 ml-2">
                    {link.fileSize != null ? formatBytes(link.fileSize) : ''}
                  </span>
                </div>

                {/* Link row */}
                <div className="flex items-center gap-2 mb-2 min-w-0">
                  <LinkIcon className="w-3.5 h-3.5 text-surface-600 shrink-0" />
                  <span
                    className={`flex-1 min-w-0 text-xs truncate font-mono ${
                      expired ? 'text-surface-600 line-through' : 'text-surface-400'
                    }`}
                  >
                    {link.url}
                  </span>
                  {/* Actions — always visible, wraps on very small screens */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => copyLink(link.url, link.token)}
                      className="p-1.5 rounded text-surface-500 hover:text-white hover:bg-surface-700 transition-colors"
                      title="Copy link"
                    >
                      {copiedToken === link.token ? (
                        <Check className="w-3.5 h-3.5 text-surface-100" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    {confirmRevoke === link.token ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => revokeMutation.mutate(link.token)}
                          disabled={revokeMutation.isPending}
                          className="text-xs text-surface-200 hover:text-white px-2 py-1 bg-surface-700 hover:bg-surface-600 rounded transition-colors"
                        >
                          {revokeMutation.isPending ? 'Revoking…' : 'Revoke'}
                        </button>
                        <button
                          onClick={() => setConfirmRevoke(null)}
                          className="text-xs text-surface-500 hover:text-surface-300 px-2 py-1 rounded transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmRevoke(link.token)}
                        className="p-1.5 rounded text-surface-500 hover:text-white hover:bg-surface-700 transition-colors"
                        title="Revoke link"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-2 flex-wrap text-xs text-surface-600">
                  {link.hasPassword && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-surface-700 text-surface-400">
                      <Lock className="w-3 h-3" /> Password
                    </span>
                  )}
                  <span
                    className={`px-1.5 py-0.5 rounded border ${
                      expired
                        ? 'border-surface-700 text-surface-400'
                        : 'border-surface-800 text-surface-500'
                    }`}
                  >
                    {link.expiresAt
                      ? expired
                        ? 'Expired'
                        : `Expires ${new Date(link.expiresAt).toLocaleDateString()}`
                      : 'Never expires'}
                  </span>
                  <span>· {link.downloadCount} download{link.downloadCount !== 1 ? 's' : ''}</span>
                  <span>· created {formatRelativeDate(link.createdAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
