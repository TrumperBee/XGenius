'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { User, LayoutDashboard, Heart, Settings, LogOut, ChevronRight, Loader2 } from 'lucide-react';
import styles from './UserAvatar.module.css';

export function UserAvatar() {
  const { user, loading, openAuthModal, openSignOutModal } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!mounted) {
    return (
      <div className={styles.avatarPlaceholder}>
        <User className="w-5 h-5" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.avatarPlaceholder}>
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <button className={styles.signInBtn} onClick={() => openAuthModal('signup')}>
        <User className="w-4 h-4" />
        Sign In
      </button>
    );
  }

  const getInitials = () => {
    if (user.full_name) {
      return user.full_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return user.email.slice(0, 2).toUpperCase();
  };

  const menuItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/dashboard?tab=favorites', icon: Heart, label: 'Favorite Teams' },
    { href: '/settings/notifications', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button
        className={styles.avatar}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Account menu"
        title="Account menu"
      >
        {user.avatar_url ? (
          <img src={user.avatar_url} alt={user.full_name || 'User'} className={styles.avatarImg} />
        ) : (
          <span className={styles.initials}>{getInitials()}</span>
        )}
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.header}>
            <div className={styles.avatarLg}>
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.full_name || 'User'} className={styles.avatarImgLg} />
              ) : (
                <span className={styles.initialsLg}>{getInitials()}</span>
              )}
            </div>
            <div className={styles.userInfo}>
              <p className={styles.userName}>{user.full_name || 'XGenius User'}</p>
              <p className={styles.userEmail}>{user.email}</p>
            </div>
          </div>

          <div className={styles.divider} />

          <nav className={styles.menu}>
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={styles.menuItem}
                onClick={() => setIsOpen(false)}
              >
                <item.icon className={styles.menuIcon} />
                <span>{item.label}</span>
                <ChevronRight className={styles.chevron} />
              </Link>
            ))}
          </nav>

          <div className={styles.divider} />

          <button
            className={styles.signOutBtn}
            onClick={() => {
              setIsOpen(false);
              openSignOutModal();
            }}
          >
            <LogOut className={styles.menuIcon} />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}
