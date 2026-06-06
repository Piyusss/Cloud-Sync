import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useQuery } from '@tanstack/react-query';
import {
  Search, Download, Loader2, FolderOpen, X,
} from 'lucide-react';
import { fileApi, searchApi } from '../api';
import type { SearchResult } from '../types';
import { formatBytes, formatRelativeDate, triggerUrlDownload } from '../utils/format';
import { FileIcon } from '../components/FileIcon';

// ── type filter options ───────────────────────────────────────────────────────

const TYPE_OPTIONS = [
  { value: '',         label: 'All types' },
  { value: 'image',    label: 'Images' },
  { value: 'video',    label: 'Videos' },
  { value: 'audio',    label: 'Audio' },
  { value: 'pdf',      label: 'PDFs' },
  { value: 'document', label: 'Documents' },
  { value: 'archive',  label: 'Archives' },
  { value: 'text',     label: 'Text files' },
];

// ── component ─────────────────────────────────────────────────────────────────

export function SearchPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [q, setQ]         = useState(() => searchParams.get('q') ?? '');
  const [type, setType]   = useState('');
  const [from, setFrom]   = useState('');
  const [to, setTo]       = useState('');
  const [debouncedQ, setDebouncedQ] = useState(() => searchParams.get('q') ?? '');

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search input on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Debounce the text query by 350 ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q), 350);
    return () => clearTimeout(timer);
  }, [q]);

  const params = {
    q:    debouncedQ || undefined,
    type: type       || undefined,
    from: from       || undefined,
    to:   to         || undefined,
  };
  const hasFilters = !!(debouncedQ || type || from || to);

  const { data: results, isLoading, isFetching } = useQuery({
    queryKey: ['search', params],
    queryFn: () => searchApi.search(params).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const handleDownload = async (result: SearchResult) => {
    const { data } = await fileApi.download(result.id);
    triggerUrlDownload(data.url);
  };

  const clearAll = () => { setQ(''); setType(''); setFrom(''); setTo(''); };
  const anyFilter = q || type || from || to;

  return (
    <div className="animate-fade-in space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Search</h1>
        <p className="text-surface-400 mt-0.5 text-sm">
          Search across all your files by name, type, or date
        </p>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by filename…"
          className="w-full bg-surface-900 border border-surface-700 rounded-lg pl-10 pr-10 py-3 text-sm text-white placeholder-surface-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30"
        />
        {isFetching && (
          <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500 animate-spin" />
        )}
        {!isFetching && q && (
          <button
            onClick={() => setQ('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-500 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filters row — stacks on mobile, inline on sm+ */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3">
        {/* Type filter */}
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full sm:w-auto bg-surface-800 border border-surface-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 cursor-pointer"
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* Date filters */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 flex-1 sm:flex-none">
            <span className="text-xs text-surface-500 shrink-0">From</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="flex-1 sm:flex-none bg-surface-800 border border-surface-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-1 sm:flex-none">
            <span className="text-xs text-surface-500 shrink-0">To</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="flex-1 sm:flex-none bg-surface-800 border border-surface-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {anyFilter && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 text-xs text-surface-500 hover:text-white transition-colors px-2 py-2 self-start sm:self-auto"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="glass-card flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-surface-500 animate-spin" />
        </div>
      ) : !results || results.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-20 text-center">
          <FolderOpen className="w-10 h-10 text-surface-600 mb-3" />
          <p className="text-surface-400 font-medium">
            {hasFilters ? 'No files match your search' : 'No files yet'}
          </p>
          <p className="text-surface-600 text-sm mt-1">
            {hasFilters
              ? 'Try different keywords or adjust the filters'
              : 'Upload files to start searching'}
          </p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-3 border-b border-surface-800">
            <p className="text-xs text-surface-500">
              {results.length} result{results.length !== 1 ? 's' : ''}
              {hasFilters ? '' : ' · showing 50 most recent'}
            </p>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-700/50">
                <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-5 py-3">Name</th>
                <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-5 py-3 hidden sm:table-cell">Location</th>
                <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-5 py-3 hidden sm:table-cell">Size</th>
                <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Modified</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {results.map((result, i) => (
                <tr
                  key={result.id}
                  className={`group hover:bg-surface-800/40 transition-colors ${
                    i < results.length - 1 ? 'border-b border-surface-800/60' : ''
                  }`}
                >
                  <td className="px-5 py-3.5 min-w-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileIcon contentType={result.contentType} />
                      <span className="text-sm text-surface-200 truncate">
                        {result.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 hidden sm:table-cell">
                    {result.folderId ? (
                      <button
                        onClick={() => navigate(`/files/${result.folderId}`)}
                        className="flex items-center gap-1.5 text-xs text-surface-400 hover:text-brand-400 transition-colors"
                        title="Go to folder"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        {result.folderName ?? 'Folder'}
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate('/files')}
                        className="text-xs text-surface-600 hover:text-surface-400 transition-colors"
                      >
                        Root
                      </button>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-surface-500 hidden sm:table-cell">
                    {formatBytes(result.size)}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-surface-500 hidden md:table-cell">
                    {formatRelativeDate(result.createdAt)}
                  </td>
                  <td className="px-5 py-3.5 shrink-0">
                    <div className="flex items-center justify-end opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleDownload(result)}
                        className="p-2 rounded-lg text-surface-500 hover:text-brand-400 hover:bg-surface-700/50 transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
