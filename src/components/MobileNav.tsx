'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CalendarDays, Search, BarChart3, User, Menu, X } from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/today', label: 'Today', icon: CalendarDays },
  { href: '/analyze', label: 'Analyze', icon: Search },
  { href: '/stats', label: 'Stats', icon: BarChart3 },
  { href: '/dashboard', label: 'Profile', icon: User },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-secondary)] border-t border-[var(--border-color)] safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex flex-col items-center justify-center flex-1 py-2 min-h-[48px] transition-colors',
                  isActive 
                    ? 'text-[var(--accent-green)]' 
                    : 'text-[var(--text-muted)]'
                )}
              >
                <div className={clsx(
                  'relative',
                  isActive && 'after:absolute after:-bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-[var(--accent-green)]'
                )}>
                  <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className="text-[10px] mt-1 font-medium">{item.label}</span>
              </Link>
            );
          })}
          
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex flex-col items-center justify-center flex-1 py-2 min-h-[48px] text-[var(--text-muted)] min-w-[48px]"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
            <span className="text-[10px] mt-1 font-medium">Menu</span>
          </button>
        </div>
      </nav>

      {drawerOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
        >
          <div 
            className="absolute left-0 top-0 bottom-0 w-72 bg-[var(--bg-secondary)] border-r border-[var(--border-color)] transform transition-transform animate-slideIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-blue)] to-[var(--accent-purple)] flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-bold">XGenius</span>
              </div>
              <button 
                onClick={() => setDrawerOpen(false)}
                className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] min-w-[48px] min-h-[48px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4">
              <nav className="space-y-1">
                {[
                  { href: '/', label: 'Home', icon: Home },
                  { href: '/today', label: 'Today', icon: CalendarDays },
                  { href: '/fixtures', label: 'Fixtures', icon: CalendarDays },
                  { href: '/analyze', label: 'Analyze', icon: Search },
                  { href: '/yesterday', label: 'Yesterday', icon: BarChart3 },
                  { href: '/stats', label: 'Stats', icon: BarChart3 },
                  { href: '/dashboard', label: 'Dashboard', icon: User },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setDrawerOpen(false)}
                      className={clsx(
                        'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors min-h-[48px]',
                        isActive 
                          ? 'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]' 
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slideIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        .animate-slideIn {
          animation: slideIn 0.2s ease-out;
        }
        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom, 0);
        }
      `}</style>
    </>
  );
}

export function MobileHeader() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  
  const getPageTitle = () => {
    if (pathname === '/') return 'XGenius';
    if (pathname === '/today') return 'Today';
    if (pathname === '/fixtures') return 'Fixtures';
    if (pathname === '/analyze') return 'Analyze';
    if (pathname === '/yesterday') return 'Yesterday';
    if (pathname === '/stats') return 'Statistics';
    if (pathname === '/dashboard') return 'Dashboard';
    if (pathname.startsWith('/match/')) return 'Match';
    return 'XGenius';
  };

  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-[var(--bg-secondary)] border-b border-[var(--border-color)]">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setDrawerOpen(true)}
            className="p-2 -ml-2 rounded-lg hover:bg-[var(--bg-tertiary)] min-w-[48px] min-h-[48px] flex items-center justify-center"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="text-lg font-bold">{getPageTitle()}</span>
        </div>
      </div>
      
      {drawerOpen && (
        <div 
          className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
        >
          <div 
            className="absolute left-0 top-0 bottom-0 w-72 bg-[var(--bg-secondary)] border-r border-[var(--border-color)] transform transition-transform animate-slideIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-blue)] to-[var(--accent-purple)] flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-bold">XGenius</span>
              </div>
              <button 
                onClick={() => setDrawerOpen(false)}
                className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] min-w-[48px] min-h-[48px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4">
              <nav className="space-y-1">
                {[
                  { href: '/', label: 'Home', icon: Home },
                  { href: '/today', label: 'Today', icon: CalendarDays },
                  { href: '/fixtures', label: 'Fixtures', icon: CalendarDays },
                  { href: '/analyze', label: 'Analyze', icon: Search },
                  { href: '/yesterday', label: 'Yesterday', icon: BarChart3 },
                  { href: '/stats', label: 'Stats', icon: BarChart3 },
                  { href: '/dashboard', label: 'Dashboard', icon: User },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setDrawerOpen(false)}
                      className={clsx(
                        'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors min-h-[48px]',
                        isActive 
                          ? 'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]' 
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
