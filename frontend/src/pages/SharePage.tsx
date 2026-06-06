import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Download, Loader2, Lock, AlertCircle,
} from 'lucide-react';
import { publicShareApi } from '../api';
import { formatBytes, triggerBlobDownload } from '../utils/format';
import { FileIcon } from '../components/FileIcon';

export function SharePage() {
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const infoQuery = useQuery({
    queryKey: ['share-public', token],
    queryFn: () => publicShareApi.info(token!).then((r) => r.data),
    enabled: !!token,
    retry: false,
  });

  const info = infoQuery.data;

  const handleDownload = async () => {
    if (info?.passwordProtected && !password) return;
    setDownloading(true);
    setDownloadError('');
    try {
      const resp = await publicShareApi.downloadBlob(
        token!,
        info?.passwordProtected ? password : undefined
      );
      triggerBlobDownload(resp.data, info?.fileName ?? 'download');
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { message?: string } } };
      if (e.response?.status === 403) {
        setDownloadError('Wrong password. Please try again.');
      } else {
        setDownloadError(e.response?.data?.message ?? 'Download failed');
      }
    } finally {
      setDownloading(false);
    }
  };

  if (infoQuery.isLoading) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-surface-500 animate-spin" />
      </div>
    );
  }

  if (infoQuery.isError || !info) {
    return (
      <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center text-center px-4">
        <AlertCircle className="w-10 h-10 text-surface-600 mb-3" />
        <p className="text-surface-300 font-medium">Link not found or expired</p>
        <p className="text-surface-500 text-sm mt-1">
          This share link may have been revoked or has expired.
        </p>
        <a
          href="/"
          className="mt-5 text-brand-400 hover:text-brand-300 text-sm transition-colors"
        >
          Go to CloudSync →
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm glass-card p-7 text-center">
        <div className="w-16 h-16 bg-surface-800 rounded-lg flex items-center justify-center mx-auto mb-4">
          <FileIcon contentType={info.contentType} className="w-8 h-8 text-surface-300" />
        </div>

        <p className="text-white font-medium text-lg break-all leading-snug">{info.fileName}</p>
        <p className="text-surface-500 text-sm mt-1.5">
          {formatBytes(info.size)}
          {info.passwordProtected && (
            <span className="ml-2 inline-flex items-center gap-1 text-surface-500">
              <Lock className="w-3 h-3" />
              Password protected
            </span>
          )}
        </p>

        {info.passwordProtected ? (
          <div className="mt-6 text-left">
            <label className="block text-sm text-surface-400 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (downloadError) setDownloadError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && password && !downloading) handleDownload();
              }}
              placeholder="Enter password to download"
              className="input-field"
              autoFocus
            />
            {downloadError ? (
              <p className="text-xs text-surface-300 mt-2">{downloadError}</p>
            ) : (
              <button
                onClick={handleDownload}
                disabled={downloading || !password}
                className="btn-primary w-full mt-3 flex items-center justify-center gap-2"
              >
                {downloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {downloading ? 'Downloading…' : 'Download'}
              </button>
            )}
          </div>
        ) : (
          <div className="mt-6">
            {downloadError && (
              <p className="text-xs text-surface-300 mb-3">{downloadError}</p>
            )}
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {downloading ? 'Downloading…' : 'Download'}
            </button>
          </div>
        )}

        <p className="text-xs text-surface-700 mt-6">Shared via CloudSync</p>
      </div>
    </div>
  );
}
