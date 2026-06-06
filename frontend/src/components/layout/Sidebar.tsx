import { NavLink, Link } from 'react-router-dom';
import {
  FolderOpen, Share2, Trash2, BarChart3, Cloud, Search, X,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { formatBytes, formatPercentage } from '../../utils/format';

const navItems = [
  { to: '/files', icon: FolderOpen, label: 'My Files' },
  { to: '/search', icon: Search, label: 'Search' },
  { to: '/shared', icon: Share2, label: 'Shared' },
  { to: '/trash', icon: Trash2, label: 'Trash' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user } = useAuth();
  const storagePercent = user ? formatPercentage(user.storageUsed, user.storageLimit) : 0;

  return (
    <aside
      className={`
        w-64 h-screen bg-surface-900 border-r border-surface-800 flex flex-col
        fixed left-0 top-0 z-30
        transform transition-transform duration-200 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
      `}
    >
      {/* Logo */}
      <div className="h-14 flex items-center gap-2.5 px-4 border-b border-surface-800 shrink-0">
        <Link
          to="/"
          onClick={onClose}
          className="flex items-center gap-2.5 flex-1 min-w-0 hover:opacity-80 transition-opacity"
          title="Back to landing page"
        >
          <div className="w-7 h-7 bg-white rounded flex items-center justify-center shrink-0">
            <Cloud className="w-4 h-4 text-surface-950" />
          </div>
          <span className="text-base font-semibold text-white truncate">CloudSync</span>
        </Link>
        <button
          onClick={onClose}
          className="md:hidden p-1.5 text-surface-500 hover:text-white hover:bg-surface-800 rounded transition-colors shrink-0"
          aria-label="Close navigation"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/files'}
            onClick={onClose}
            className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
          >
            <item.icon className="w-4 h-4" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Storage */}
      <div className="px-3 py-3 border-t border-surface-800 shrink-0">
        <div className="px-3 py-3 rounded-md bg-surface-800 border border-surface-700">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-surface-400 font-medium">Storage</span>
            <span className="text-surface-500">{storagePercent}%</span>
          </div>
          <div className="w-full h-1.5 bg-surface-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.max(storagePercent, 1)}%`,
                background: storagePercent > 80 ? 'rgb(var(--surface-50))' : 'rgb(var(--surface-500))',
              }}
            />
          </div>
          <p className="mt-2 text-xs text-surface-500">
            {user ? `${formatBytes(user.storageUsed)} of ${formatBytes(user.storageLimit)}` : ''}
          </p>
        </div>
      </div>
    </aside>
  );
}
