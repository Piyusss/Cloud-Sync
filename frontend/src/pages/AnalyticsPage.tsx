import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  HardDrive, FileText, FolderOpen, Loader2,
  Upload, Download, Trash2, FolderPlus, Link, RotateCcw, Folder,
  TrendingDown, Clock, Play, CheckCircle,
} from 'lucide-react';
import { analyticsApi, jobsApi } from '../api';
import type { ActivityItem, FileStats, JobStatus, TypeBreakdown } from '../types';
import { formatBytes, formatRelativeDate } from '../utils/format';
import { FileIcon } from '../components/FileIcon';

// ── helpers ───────────────────────────────────────────────────────────────────

function activityIcon(action: string) {
  const cls = 'w-3.5 h-3.5 shrink-0 text-surface-300';
  switch (action) {
    case 'UPLOAD':          return <Upload        className={cls} />;
    case 'DOWNLOAD':        return <Download      className={cls} />;
    case 'DELETE':          return <Trash2        className={cls} />;
    case 'FOLDER_CREATE':   return <FolderPlus    className={cls} />;
    case 'FOLDER_DELETE':   return <Folder        className={cls} />;
    case 'SHARE_CREATE':    return <Link          className={cls} />;
    case 'VERSION_RESTORE': return <RotateCcw     className={cls} />;
    default:                return <FileText      className={cls} />;
  }
}

function activityLabel(item: ActivityItem): string {
  const name = item.fileName ?? 'item';
  switch (item.action) {
    case 'UPLOAD':          return `Uploaded ${name}`;
    case 'DOWNLOAD':        return `Downloaded ${name}`;
    case 'DELETE':          return `Deleted ${name}`;
    case 'FOLDER_CREATE':   return `Created folder "${name}"`;
    case 'FOLDER_DELETE':   return `Deleted folder "${name}"`;
    case 'SHARE_CREATE':    return `Shared ${name}`;
    case 'VERSION_RESTORE': return `Restored version of ${name}`;
    default:                return name;
  }
}

// Monochrome chart palette — distinguished by lightness, not hue. Driven by the
// theme surface vars so the chips invert correctly in light mode.
const TYPE_COLORS: Record<string, string> = {
  Images:  'rgb(var(--surface-50))',
  Videos:  'rgb(var(--surface-300))',
  Audio:   'rgb(var(--surface-400))',
  PDFs:    'rgb(var(--surface-500))',
  Text:    'rgb(var(--surface-600))',
  Other:   'rgb(var(--surface-700))',
};

// ── component ─────────────────────────────────────────────────────────────────

export function AnalyticsPage() {
  const queryClient = useQueryClient();
  const [triggeringJob, setTriggeringJob] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => analyticsApi.get().then((r) => r.data),
    staleTime: 30_000,
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => jobsApi.getStatus().then((r) => r.data),
    refetchInterval: 10_000,
  });

  const triggerMutation = useMutation({
    mutationFn: (jobName: string) => jobsApi.trigger(jobName),
    onMutate: (jobName) => setTriggeringJob(jobName),
    onSettled: () => {
      setTriggeringJob(null);
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  if (isLoading || !data) {
    return (
      <div className="animate-fade-in">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-surface-400 mt-0.5 text-sm">Storage insights and usage statistics</p>
        </div>
        <div className="glass-card flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 text-surface-500 animate-spin" />
        </div>
      </div>
    );
  }

  const storagePercent = data.storageLimit > 0
    ? Math.round((data.storageUsed / data.storageLimit) * 100) : 0;
  const totalTypeSize = data.storageByType.reduce((s, t) => s + t.totalSize, 0) || 1;

  return (
    <div className="animate-fade-in space-y-6 max-w-5xl">

      {/* Heading */}
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-surface-400 mt-0.5 text-sm">Storage insights and usage statistics</p>
      </div>

      {/* ── Stats row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Storage Used',  value: formatBytes(data.storageUsed),  sub: `of ${formatBytes(data.storageLimit)}`,  icon: HardDrive },
          { label: 'Total Files',   value: String(data.filesCount),        sub: 'files stored',                          icon: FileText  },
          { label: 'Folders',       value: String(data.foldersCount),      sub: 'created',                               icon: FolderOpen },
          { label: 'Storage Free',  value: formatBytes(data.storageLimit - data.storageUsed), sub: 'available',          icon: TrendingDown },
        ].map((s) => (
          <div key={s.label} className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <s.icon className="w-4 h-4 text-surface-500" />
              <span className="text-xs text-surface-500 font-medium">{s.label}</span>
            </div>
            <p className="text-2xl font-semibold text-white">{s.value}</p>
            <p className="text-xs text-surface-600 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Storage usage bar ─────────────────────────────────────────────── */}
      <div className="glass-card p-4 sm:p-5">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-sm font-medium text-surface-200">Storage Usage</span>
          <span className="text-sm text-surface-400">{storagePercent}%</span>
        </div>
        <div className="w-full h-2 bg-surface-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.max(storagePercent, 1)}%`,
              background: storagePercent > 80 ? 'rgb(var(--surface-50))' : storagePercent > 60 ? 'rgb(var(--surface-400))' : 'rgb(var(--surface-500))',
            }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-xs text-surface-500">{formatBytes(data.storageUsed)} used</span>
          <span className="text-xs text-surface-500">{formatBytes(data.storageLimit - data.storageUsed)} free</span>
        </div>
      </div>

      {/* ── Storage by type ───────────────────────────────────────────────── */}
      {data.storageByType.length > 0 && (
        <div className="glass-card p-4 sm:p-5">
          <p className="text-sm font-medium text-surface-200 mb-4">Storage by Type</p>
          <div className="space-y-3">
            {data.storageByType.map((t: TypeBreakdown) => {
              const pct = Math.round((t.totalSize / totalTypeSize) * 100);
              const color = TYPE_COLORS[t.typeLabel] ?? 'rgb(var(--surface-600))';
              return (
                <div key={t.typeLabel}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                      <span className="text-sm text-surface-300">{t.typeLabel}</span>
                      <span className="text-xs text-surface-600">{t.count} file{t.count !== 1 ? 's' : ''}</span>
                    </div>
                    <span className="text-xs text-surface-400">{formatBytes(t.totalSize)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Largest files + Most downloaded ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Largest files */}
        <div className="glass-card overflow-hidden">
          <div className="px-4 sm:px-5 py-3.5 border-b border-surface-800">
            <p className="text-sm font-medium text-surface-200">Largest Files</p>
          </div>
          {data.largestFiles.length === 0 ? (
            <p className="text-sm text-surface-600 text-center py-8">No files yet</p>
          ) : (
            <div>
              {data.largestFiles.map((f: FileStats, i: number) => (
                <div
                  key={f.id}
                  className={`flex items-center gap-3 px-5 py-3 ${
                    i < data.largestFiles.length - 1 ? 'border-b border-surface-800/60' : ''
                  }`}
                >
                  <FileIcon contentType={f.contentType} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-surface-200 truncate">{f.name}</p>
                  </div>
                  <span className="text-xs text-surface-500 shrink-0">{formatBytes(f.size)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Most downloaded */}
        <div className="glass-card overflow-hidden">
          <div className="px-4 sm:px-5 py-3.5 border-b border-surface-800">
            <p className="text-sm font-medium text-surface-200">Most Downloaded</p>
          </div>
          {data.mostDownloaded.length === 0 ? (
            <p className="text-sm text-surface-600 text-center py-8">No shared downloads yet</p>
          ) : (
            <div>
              {data.mostDownloaded.map((f: FileStats, i: number) => (
                <div
                  key={f.id}
                  className={`flex items-center gap-3 px-5 py-3 ${
                    i < data.mostDownloaded.length - 1 ? 'border-b border-surface-800/60' : ''
                  }`}
                >
                  <FileIcon contentType={f.contentType} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-surface-200 truncate">{f.name}</p>
                  </div>
                  <span className="text-xs text-surface-500 shrink-0">
                    {f.downloadCount} download{f.downloadCount !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Scheduled Jobs ───────────────────────────────────────────────── */}
      <div className="glass-card overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-surface-800">
          <p className="text-sm font-medium text-surface-200">Scheduled Jobs</p>
        </div>
        <div>
          {(jobs as JobStatus[]).map((job, i) => (
            <div
              key={job.jobName}
              className={`flex items-start gap-3 sm:gap-4 px-4 sm:px-5 py-4 ${
                i < jobs.length - 1 ? 'border-b border-surface-800/60' : ''
              }`}
            >
              <div className="w-8 h-8 rounded bg-surface-800 flex items-center justify-center shrink-0 mt-0.5">
                {job.lastRun
                  ? <CheckCircle className="w-4 h-4 text-surface-200" />
                  : <Clock className="w-4 h-4 text-surface-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                  <p className="text-sm font-medium text-surface-200">{job.jobName}</p>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-surface-800 text-surface-500 font-mono">
                    {job.schedule.split('(')[1]?.replace(')', '') ?? job.schedule}
                  </span>
                </div>
                <p className="text-xs text-surface-500 mb-1">{job.description}</p>
                <p className="text-xs text-surface-600">
                  {job.lastRun
                    ? <>Last run: {formatRelativeDate(job.lastRun)} · {job.lastResult}</>
                    : 'Not run since server startup'}
                </p>
                {/* Run now on mobile — shown inline below description */}
                <button
                  onClick={() => triggerMutation.mutate(job.jobName)}
                  disabled={triggeringJob === job.jobName}
                  className="mt-2 sm:hidden flex items-center gap-1.5 px-3 py-1.5 rounded text-xs text-surface-400 hover:text-white border border-surface-700 hover:border-surface-500 hover:bg-surface-800 transition-colors disabled:opacity-50"
                >
                  {triggeringJob === job.jobName
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Play className="w-3.5 h-3.5" />}
                  Run now
                </button>
              </div>
              <button
                onClick={() => triggerMutation.mutate(job.jobName)}
                disabled={triggeringJob === job.jobName}
                className="hidden sm:flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded text-xs text-surface-400 hover:text-white border border-surface-700 hover:border-surface-500 hover:bg-surface-800 transition-colors disabled:opacity-50"
                title="Run now"
              >
                {triggeringJob === job.jobName
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Play className="w-3.5 h-3.5" />}
                Run now
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Recent activity ───────────────────────────────────────────────── */}
      <div className="glass-card overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-surface-800">
          <p className="text-sm font-medium text-surface-200">Recent Activity</p>
        </div>
        {data.recentActivity.length === 0 ? (
          <p className="text-sm text-surface-600 text-center py-8">No activity yet</p>
        ) : (
          <div>
            {data.recentActivity.map((item: ActivityItem, i: number) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 px-5 py-3 ${
                  i < data.recentActivity.length - 1 ? 'border-b border-surface-800/60' : ''
                }`}
              >
                <div className="w-6 h-6 rounded bg-surface-800 flex items-center justify-center shrink-0">
                  {activityIcon(item.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-surface-200 truncate">{activityLabel(item)}</p>
                  {item.fileSize != null && (
                    <p className="text-xs text-surface-600">{formatBytes(item.fileSize)}</p>
                  )}
                </div>
                <span className="text-xs text-surface-600 shrink-0">
                  {formatRelativeDate(item.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
