'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  CalendarDays, 
  Search, 
  BarChart3, 
  User, 
  TrendingUp,
  Clock,
  ChevronRight,
  Calendar
} from 'lucide-react';
import { clsx } from 'clsx';
import { NotificationBell } from '@/components/NotificationBell';
import { UserAvatar } from '@/components/UserAvatar';
import { StreakBadge } from '@/components/StreakBadge';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/today', label: 'Today', icon: CalendarDays },
  { href: '/fixtures', label: 'Fixtures', icon: Calendar },
  { href: '/analyze', label: 'Analyze', icon: Search },
  { href: '/yesterday', label: 'Yesterday', icon: Clock },
  { href: '/stats', label: 'Stats', icon: BarChart3 },
  { href: '/dashboard', label: 'Dashboard', icon: User },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-secondary)] border-b border-[var(--border-color)]">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[var(--accent-blue)] to-[var(--accent-purple)] flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">XGenius</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive 
                      ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]' 
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <StreakBadge />
            <NotificationBell />
            <UserAvatar />
          </div>
        </div>
      </div>
    </nav>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 bg-[var(--bg-secondary)] border-r border-[var(--border-color)] hidden lg:block">
      <div className="p-4">
        <div className="mb-6">
          <h3 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">
            Navigation
          </h3>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive 
                      ? 'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]' 
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mb-6">
          <h3 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">
            Quick Stats
          </h3>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-[var(--bg-tertiary)]">
              <p className="text-xs text-[var(--text-muted)]">Yesterday</p>
              <p className="text-lg font-bold text-[var(--accent-green)]">68%</p>
            </div>
            <div className="p-3 rounded-lg bg-[var(--bg-tertiary)]">
              <p className="text-xs text-[var(--text-muted)]">This Week</p>
              <p className="text-lg font-bold">71%</p>
            </div>
            <div className="p-3 rounded-lg bg-[var(--bg-tertiary)]">
              <p className="text-xs text-[var(--text-muted)]">ROI</p>
              <p className="text-lg font-bold text-[var(--accent-green)]">+11.2%</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
