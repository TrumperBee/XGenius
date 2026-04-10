'use client';

import { usePathname } from 'next/navigation';
import { PageBackground } from '@/components/Background';
import { Navbar, Sidebar } from '@/components/Navbar';
import { LoadingProvider } from '@/components/LoadingContext';
import { InitialLoadingScreen } from '@/components/InitialLoadingScreen';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  const getBackgroundType = () => {
    if (pathname === '/') return 'home';
    if (pathname === '/today') return 'today';
    if (pathname === '/yesterday') return 'yesterday';
    if (pathname === '/analyze') return 'analyzer';
    if (pathname === '/stats') return 'stats';
    if (pathname === '/dashboard') return 'dashboard';
    if (pathname.startsWith('/match')) return 'today';
    if (pathname.startsWith('/fixtures')) return 'today';
    return 'default';
  };

  return (
    <LoadingProvider>
      <InitialLoadingScreen />
      <PageBackground type={getBackgroundType()}>
        <Navbar />
        <Sidebar />
        <main className="pt-16 lg:pl-64">
          <div className="max-w-7xl mx-auto p-4 lg:p-6">
            {children}
          </div>
        </main>
      </PageBackground>
    </LoadingProvider>
  );
}
