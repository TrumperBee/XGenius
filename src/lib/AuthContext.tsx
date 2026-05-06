'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, getCurrentUser, onAuthStateChange } from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  showAuthModal: boolean;
  authModalTab: 'signin' | 'signup';
  showOnboarding: boolean;
  onboardingUser: User | null;
  showSignOutModal: boolean;
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  openAuthModal: (tab?: 'signin' | 'signup') => void;
  closeAuthModal: () => void;
  openOnboarding: (user: User) => void;
  closeOnboarding: () => void;
  openSignOutModal: () => void;
  closeSignOutModal: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ONBOARDING_KEY = 'xgenius_onboarding_completed';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'signin' | 'signup'>('signup');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingUser, setOnboardingUser] = useState<User | null>(null);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const refreshUser = useCallback(async () => {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const initAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        
        if (currentUser) {
          const onboardingCompleted = localStorage.getItem(ONBOARDING_KEY);
          if (!onboardingCompleted) {
            setOnboardingUser(currentUser);
            setShowOnboarding(true);
          }
        }
      } catch (e) {
        console.error('Auth init error:', e);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const unsubscribe = onAuthStateChange(async (authUser) => {
      if (authUser) {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, [mounted]);

  const openAuthModal = useCallback((tab: 'signin' | 'signup' = 'signup') => {
    setAuthModalTab(tab);
    setShowAuthModal(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setShowAuthModal(false);
  }, []);

  const openOnboarding = useCallback((user: User) => {
    setOnboardingUser(user);
    setShowOnboarding(true);
  }, []);

  const closeOnboarding = useCallback(() => {
    setShowOnboarding(false);
    localStorage.setItem(ONBOARDING_KEY, 'true');
  }, []);

  const openSignOutModal = useCallback(() => {
    setShowSignOutModal(true);
  }, []);

  const closeSignOutModal = useCallback(() => {
    setShowSignOutModal(false);
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  }, []);

  const handleAuthSuccess = useCallback(async (authUser: User) => {
    setUser(authUser);
    closeAuthModal();
    
    const onboardingCompleted = localStorage.getItem(ONBOARDING_KEY);
    if (!onboardingCompleted) {
      openOnboarding(authUser);
    } else {
      showToast(`Welcome back, ${authUser.full_name?.split(' ')[0] || 'there'}!`, 'success');
    }
  }, [closeAuthModal, openOnboarding, showToast]);

  const handleSignOut = useCallback(async () => {
    setShowSignOutModal(false);
    const { signOut } = await import('@/lib/auth');
    await signOut();
    setUser(null);
    showToast('You have been signed out. See you next time!', 'info');
  }, [showToast]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        showAuthModal,
        authModalTab,
        showOnboarding,
        onboardingUser,
        showSignOutModal,
        toast,
        openAuthModal,
        closeAuthModal,
        openOnboarding,
        closeOnboarding,
        openSignOutModal,
        closeSignOutModal,
        showToast,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
