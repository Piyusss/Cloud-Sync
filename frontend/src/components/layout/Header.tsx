import { Menu } from 'lucide-react';
import { UserButton } from '@clerk/clerk-react';
import { NotificationBell } from '../NotificationBell';
import { ThemeToggle } from '../../theme/ThemeToggle';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="h-14 bg-surface-900 border-b border-surface-800 flex items-center gap-2 px-4 sm:px-6 sticky top-0 z-20">
      <button
        onClick={onMenuClick}
        className="md:hidden p-2 -ml-1 text-surface-400 hover:text-white hover:bg-surface-800 rounded-md transition-colors"
        aria-label="Open navigation"
      >
        <Menu className="w-5 h-5" />
      </button>
      <div className="flex-1" />
      <ThemeToggle />
      <NotificationBell />
      <UserButton
        appearance={{
          elements: {
            avatarBox: 'w-8 h-8',
          },
        }}
      />
    </header>
  );
}
