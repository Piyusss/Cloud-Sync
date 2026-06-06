import { useEffect, useRef, useState } from 'react';
import { Bell, Upload, Share2, AlertTriangle, RotateCcw, X } from 'lucide-react';
import { useNotifications, type AppNotification } from '../hooks/useNotifications';
import { formatRelativeDate } from '../utils/format';

function NotifIcon({ type }: { type: string }) {
  const cls = 'w-4 h-4 shrink-0';
  if (type === 'UPLOAD_COMPLETE') return <Upload     className={`${cls} text-surface-300`} />;
  if (type === 'FILE_SHARED')     return <Share2     className={`${cls} text-surface-300`} />;
  if (type === 'STORAGE_WARNING') return <AlertTriangle className={`${cls} text-surface-200`} />;
  if (type === 'RESTORE')         return <RotateCcw  className={`${cls} text-surface-300`} />;
  return <Bell className={`${cls} text-surface-400`} />;
}

export function NotificationBell() {
  const { notifications, unread, markAllRead, dismiss } = useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggle = () => {
    setOpen((v) => !v);
    if (!open && unread > 0) markAllRead();
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={toggle}
        className="relative p-1.5 rounded-md text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-white text-surface-950 text-[10px] font-semibold flex items-center justify-center leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel — fixed on mobile so it stays within viewport */}
      {open && (
        <div className="
          fixed right-4 top-14
          sm:absolute sm:right-0 sm:top-9
          w-[calc(100vw-2rem)] max-w-[20rem]
          bg-surface-900 border border-surface-800 rounded-lg shadow-xl z-50 overflow-hidden
        ">
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800">
            <span className="text-sm font-medium text-white">Notifications</span>
            {notifications.length > 0 && (
              <button
                onClick={() => { markAllRead(); setOpen(false); }}
                className="text-xs text-surface-500 hover:text-surface-300 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Bell className="w-8 h-8 text-surface-700 mb-2" />
                <p className="text-sm text-surface-500">No notifications yet</p>
                <p className="text-xs text-surface-600 mt-0.5">
                  Upload a file to see live updates
                </p>
              </div>
            ) : (
              notifications.map((n: AppNotification) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-surface-800/60 last:border-0 ${
                    !n.read ? 'bg-surface-800/30' : ''
                  }`}
                >
                  <div className="mt-0.5 w-7 h-7 rounded-md bg-surface-800 border border-surface-700 flex items-center justify-center shrink-0">
                    <NotifIcon type={n.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-surface-100">{n.title}</p>
                    <p className="text-xs text-surface-500 mt-0.5 leading-relaxed line-clamp-2">
                      {n.message}
                    </p>
                    <p className="text-[11px] text-surface-600 mt-1">
                      {formatRelativeDate(n.timestamp)}
                    </p>
                  </div>
                  <button
                    onClick={() => dismiss(n.id)}
                    className="mt-0.5 p-0.5 text-surface-600 hover:text-surface-300 transition-colors shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
