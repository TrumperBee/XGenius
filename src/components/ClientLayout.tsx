'use client';

import { usePathname } from 'next/navigation';
import { PageBackground } from '@/components/Background';
import { Navbar, Sidebar } from '@/components/Navbar';
import { LoadingProvider } from '@/components/LoadingContext';
import { InitialLoadingScreen } from '@/components/InitialLoadingScreen';
import { NotificationProvider } from '@/lib/notificationService';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { AuthModal, OnboardingModal, SignOutModal, Toast } from '@/components/AuthModal';
import { SignUpBanner } from '@/components/SignUpBanner';

function AuthModals() {
  const {
    showAuthModal,
    authModalTab,
    closeAuthModal,
    showOnboarding,
    onboardingUser,
    closeOnboarding,
    showSignOutModal,
    closeSignOutModal,
    toast,
    user,
  } = useAuth();

  return (
    <>
      <AuthModal
        isOpen={showAuthModal}
        onClose={closeAuthModal}
        initialTab={authModalTab}
      />
      {onboardingUser && (
        <OnboardingModal
          isOpen={showOnboarding}
          user={onboardingUser}
          onComplete={closeOnboarding}
          onSkip={closeOnboarding}
        />
      )}
      <SignOutModal
        isOpen={showSignOutModal}
        onConfirm={async () => {
          const { signOut } = await import('@/lib/auth');
          await signOut();
          closeSignOutModal();
          window.location.reload();
        }}
        onCancel={closeSignOutModal}
      />
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => useAuth().showToast('')}
        />
      )}
    </>
  );
}

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
      <NotificationProvider>
        <AuthProvider>
          <InitialLoadingScreen />
          <PageBackground type={getBackgroundType()}>
            <Navbar />
            <Sidebar />
            <main className="pt-16 lg:pl-64 pb-20 lg:pb-6">
              <div className="max-w-7xl mx-auto p-4 lg:p-6">
                {children}
              </div>
            </main>
            <SignUpBanner />
            <AuthModals />
          </PageBackground>
        </AuthProvider>
      </NotificationProvider>
    </LoadingProvider>
  );
}
