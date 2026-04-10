'use client';

import React, { useEffect, useState, useMemo } from 'react';
export { GuardianBadge } from '@/components/ui';

interface BackgroundImage {
  home: string;
  today: string;
  yesterday: string;
  analyzer: string;
  stats: string;
  dashboard: string;
  default: string;
}

const STADIUM_BACKGROUNDS: BackgroundImage = {
  home: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1920&q=60',
  today: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1920&q=60',
  yesterday: 'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=1920&q=60',
  analyzer: 'https://images.unsplash.com/photo-1459865264687-595d652de67e?w=1920&q=60',
  stats: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1920&q=60',
  dashboard: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1920&q=60',
  default: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1920&q=60',
};

function isMobile() {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function slowSpeed() {
  if (typeof window === 'undefined') return false;
  const connection = (navigator as any).connection;
  if (connection) {
    return connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g';
  }
  return false;
}

export function PageBackground({ 
  children, 
  type = 'default' 
}: { 
  children: React.ReactNode; 
  type?: keyof BackgroundImage;
}) {
  const [bgLoaded, setBgLoaded] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(true);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);

  const backgroundUrl = STADIUM_BACKGROUNDS[type] || STADIUM_BACKGROUNDS.default;

  useEffect(() => {
    setIsMobileDevice(isMobile());
    setShouldAnimate(!isMobile() && !slowSpeed());

    if (isMobile() || slowSpeed()) {
      setBgLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!shouldAnimate) return;

    const interval = setInterval(() => {
      setZoomLevel(prev => {
        const next = prev + 0.1;
        return next > 105 ? 100 : next;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [shouldAnimate]);

  const handleImageLoad = () => {
    setBgLoaded(true);
  };

  return (
    <div className="relative min-h-screen">
      <div 
        className={`fixed inset-0 bg-cover bg-center transition-opacity duration-1000 ${bgLoaded ? 'opacity-100' : 'opacity-0'}`}
        style={{ 
          backgroundImage: `url('${backgroundUrl}')`,
          transform: `scale(${zoomLevel / 100})`,
          transition: shouldAnimate ? 'transform 0.5s ease-out' : 'none',
        }}
      />
      
      <div className="fixed inset-0 bg-gradient-to-b from-black/90 via-black/80 to-black/90" />
      
      <div className="fixed inset-0 bg-gradient-to-br from-black/50 via-transparent to-black/50" />
      
      <div 
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, rgba(34, 197, 94, 0.03) 0%, transparent 50%)`,
        }}
      />
      
      <div className="fixed inset-0 pointer-events-none" style={{
        background: `radial-gradient(ellipse at 0% 0%, rgba(34, 197, 94, 0.02) 0%, transparent 40%),
                    radial-gradient(ellipse at 100% 0%, rgba(34, 197, 94, 0.02) 0%, transparent 40%)`,
      }} />
      
      <div 
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)',
        }}
      />
      
      <div className="relative z-10">
        {children}
      </div>

      {!bgLoaded && (
        <div className="fixed inset-0 bg-black/95" />
      )}

      <img
        src={backgroundUrl}
        alt=""
        onLoad={handleImageLoad}
        className="hidden"
      />
    </div>
  );
}

export function GlassCard({ 
  children, 
  className = '',
  hover = true 
}: { 
  children: React.ReactNode; 
  className?: string;
  hover?: boolean;
}) {
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
    setIsMobileDevice(isMobile());
  }, []);

  return (
    <div className={`
      bg-black/40 backdrop-blur-xl
      ${isMobileDevice ? 'backdrop-blur-md' : ''}
      border border-white/10 rounded-xl
      ${hover ? 'hover:border-green-500/30 hover:bg-black/50 hover:shadow-[0_0_30px_rgba(34,197,94,0.15)]' : ''}
      transition-all duration-300
      ${className}
    `}>
      {children}
    </div>
  );
}

export function GlassCardHeader({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode; 
  className?: string;
}) {
  return (
    <div className={`px-5 py-4 border-b border-white/10 ${className}`}>
      {children}
    </div>
  );
}

export function GlassCardContent({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode; 
  className?: string;
}) {
  return (
    <div className={`p-5 ${className}`}>
      {children}
    </div>
  );
}

export function StatCardGlass({ 
  label, 
  value, 
  icon: Icon,
  trend,
  subtitle,
  className = ''
}: {
  label: string;
  value: string | number;
  icon?: React.ElementType;
  trend?: { value: number; positive: boolean };
  subtitle?: string;
  className?: string;
}) {
  return (
    <GlassCard className={className}>
      <GlassCardContent className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
          <p className="text-2xl font-bold font-mono text-white">{value}</p>
          {trend && (
            <p className={`text-xs mt-1 ${trend.positive ? 'text-green-400' : 'text-red-400'}`}>
              {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
          )}
          {subtitle && !trend && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
            <Icon className="w-5 h-5 text-green-400" />
          </div>
        )}
      </GlassCardContent>
    </GlassCard>
  );
}

export function QuickActionGlass({ 
  href, 
  icon: Icon,
  label,
  color = 'blue'
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  color?: 'blue' | 'green' | 'yellow' | 'purple';
}) {
  const colors = {
    blue: 'hover:bg-blue-500/10 hover:border-blue-500/30',
    green: 'hover:bg-green-500/10 hover:border-green-500/30',
    yellow: 'hover:bg-yellow-500/10 hover:border-yellow-500/30',
    purple: 'hover:bg-purple-500/10 hover:border-purple-500/30',
  };

  const iconColors = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    purple: 'text-purple-400',
  };

  return (
    <a 
      href={href}
      className={`
        p-3 rounded-xl bg-black/30 backdrop-blur-sm
        border border-white/10
        ${colors[color]}
        text-center transition-all duration-300
        hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(34,197,94,0.1)]
      `}
    >
      <Icon className={`w-5 h-5 mx-auto mb-1 ${iconColors[color]}`} />
      <span className="text-xs text-gray-300">{label}</span>
    </a>
  );
}

export function MatchCardGlass({ 
  children,
  href,
  hoverColor = 'blue'
}: {
  children: React.ReactNode;
  href: string;
  hoverColor?: 'blue' | 'green' | 'yellow';
}) {
  const colors = {
    blue: 'hover:bg-blue-500/10 hover:border-blue-500/30',
    green: 'hover:bg-green-500/10 hover:border-green-500/30',
    yellow: 'hover:bg-yellow-500/10 hover:border-yellow-500/30',
  };

  return (
    <a 
      href={href}
      className={`
        p-4 rounded-xl bg-black/30 backdrop-blur-sm
        border border-white/10
        ${colors[hoverColor]}
        flex items-center justify-between transition-all duration-300
        hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(34,197,94,0.1)]
      `}
    >
      {children}
    </a>
  );
}

export function SectionTitle({ 
  children,
  className = ''
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h1 className={`text-2xl font-bold text-white ${className}`}>
      {children}
    </h1>
  );
}

export function SectionSubtitle({ 
  children,
  className = ''
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={`text-sm text-gray-400 ${className}`}>
      {children}
    </p>
  );
}

export function ProgressBarGlass({ 
  value, 
  color,
  className = ''
}: {
  value: number;
  color?: string;
  className?: string;
}) {
  const barColor = color || 'var(--accent-green)';
  
  return (
    <div className={`h-2 bg-white/10 rounded-full overflow-hidden ${className}`}>
      <div
        className="h-full rounded-full transition-all duration-500 relative"
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          backgroundColor: barColor,
          boxShadow: `0 0 10px ${barColor}50`
        }}
      >
        <div 
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
          style={{ width: '50%' }}
        />
      </div>
    </div>
  );
}

export function BadgeGlass({ 
  children,
  variant = 'default'
}: {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}) {
  const variants = {
    default: 'bg-white/10 text-gray-300 border-white/20',
    success: 'bg-green-500/20 text-green-400 border-green-500/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    danger: 'bg-red-500/20 text-red-400 border-red-500/30',
    info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  };

  return (
    <span className={`
      px-2 py-0.5 text-xs rounded-full font-medium border
      ${variants[variant]}
    `}>
      {children}
    </span>
  );
}

export function LoadingSpinner({ 
  size = 24,
  className = ''
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div 
      className={`border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export function SkeletonGlass({ 
  className = ''
}: {
  className?: string;
}) {
  return (
    <div className={`
      bg-gradient-to-r from-white/5 via-white/10 to-white/5
      bg-[length:200%_100%] animate-shimmer rounded
      ${className}
    `} />
  );
}
