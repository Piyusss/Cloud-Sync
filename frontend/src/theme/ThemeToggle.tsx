import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';

/** Sun/moon button that flips between light and dark themes. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggle}
      className={`p-1.5 rounded-md text-surface-400 hover:text-white hover:bg-surface-800 transition-colors ${className}`}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}
