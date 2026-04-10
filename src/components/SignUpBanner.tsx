'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Sparkles, X } from 'lucide-react';
import styles from './SignUpBanner.module.css';

export function SignUpBanner() {
  const { user, openAuthModal } = useAuth();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !user && !dismissed) {
      const timer = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [mounted, user, dismissed]);

  if (!mounted || user || dismissed) return null;

  return (
    <div className={`${styles.banner} ${visible ? styles.visible : ''}`}>
      <div className={styles.content}>
        <Sparkles className={styles.icon} />
        <p className={styles.text}>
          Sign up to save predictions and track your accuracy
        </p>
        <button 
          className={styles.btn}
          onClick={() => openAuthModal('signup')}
        >
          Get Started
        </button>
      </div>
      <button 
        className={styles.closeBtn}
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
