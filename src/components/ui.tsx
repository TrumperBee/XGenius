import { clsx } from 'clsx';
import { LucideIcon } from 'lucide-react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className, hover = true }: CardProps) {
  return (
    <div className={clsx(
      'bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg transition-all duration-300',
      hover && 'hover:border-[var(--accent-green)] hover:shadow-[0_0_20px_rgba(34,197,94,0.2),0_0_40px_rgba(34,197,94,0.1)] hover:-translate-y-0.5',
      className
    )}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={clsx('px-5 py-4 border-b border-[var(--border-color)]', className)}>
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function CardTitle({ children, className }: CardTitleProps) {
  return (
    <h3 className={clsx('text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider', className)}>
      {children}
    </h3>
  );
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className }: CardContentProps) {
  return (
    <div className={clsx('p-5', className)}>
      {children}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: { value: number; positive: boolean };
  subtitle?: string;
  className?: string;
}

export function StatCard({ label, value, icon: Icon, trend, subtitle, className }: StatCardProps) {
  return (
    <Card className={className}>
      <CardContent className="flex items-center justify-between">
        <div>
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">{label}</p>
          <p className="text-2xl font-bold font-mono">{value}</p>
          {trend && (
            <p className={clsx('text-xs mt-1', trend.positive ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]')}>
              {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
          )}
          {subtitle && !trend && (
            <p className="text-xs text-[var(--text-muted)] mt-1">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center">
            <Icon className="w-5 h-5 text-[var(--text-secondary)]" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]',
    success: 'bg-[var(--accent-green)]/20 text-[var(--accent-green)] border border-[var(--accent-green)]/30',
    warning: 'bg-[var(--accent-yellow)]/20 text-[var(--accent-yellow)] border border-[var(--accent-yellow)]/30',
    danger: 'bg-[var(--accent-red)]/20 text-[var(--accent-red)] border border-[var(--accent-red)]/30',
    info: 'bg-[var(--accent-blue)]/20 text-[var(--accent-blue)] border border-[var(--accent-blue)]/30',
  };

  return (
    <span className={clsx('px-2 py-0.5 text-xs rounded-full font-medium', variants[variant], className)}>
      {children}
    </span>
  );
}

interface ConfidenceGaugeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export function ConfidenceGauge({ score, size = 'md' }: ConfidenceGaugeProps) {
  const sizes = {
    sm: { width: 60, height: 30, fontSize: 'text-xs' },
    md: { width: 100, height: 50, fontSize: 'text-sm' },
    lg: { width: 140, height: 70, fontSize: 'text-lg' },
  };

  const { width, height, fontSize } = sizes[size];
  const radius = width / 2;
  const circumference = Math.PI * radius;
  const progress = (score / 100) * circumference;

  const getColor = (s: number) => {
    if (s >= 80) return 'var(--accent-green)';
    if (s >= 60) return 'var(--accent-yellow)';
    return 'var(--accent-red)';
  };

  return (
    <div className="relative" style={{ width, height }}>
      <svg width={width} height={height} className="overflow-visible">
        <path
          d={`M 0 ${height} A ${radius} ${radius} 0 0 1 ${width} ${height}`}
          fill="none"
          stroke="var(--border-color)"
          strokeWidth="8"
        />
        <path
          d={`M 0 ${height} A ${radius} ${radius} 0 0 1 ${width} ${height}`}
          fill="none"
          stroke={getColor(score)}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-end justify-center pb-1">
        <span className={clsx('font-bold font-mono', fontSize)}>{score}</span>
      </div>
    </div>
  );
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'glow';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ children, variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  const variants = {
    primary: 'bg-[var(--accent-blue)] hover:bg-[#2563eb] text-white',
    secondary: 'bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)] text-[var(--text-primary)]',
    ghost: 'bg-transparent hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]',
    glow: 'bg-gradient-to-r from-[var(--accent-green)] to-emerald-500 hover:from-emerald-500 hover:to-[var(--accent-green)] text-white shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)]',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={clsx(
        'rounded-md font-medium transition-all duration-300 disabled:opacity-50',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  glow?: boolean;
  className?: string;
}

export function ProgressBar({ value, max = 100, color, glow = true, className }: ProgressBarProps) {
  const percentage = Math.min(100, (value / max) * 100);
  
  return (
    <div className={clsx('h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden', className)}>
      <div
        className={clsx(
          'h-full rounded-full transition-all duration-500 relative',
          glow && percentage > 10 && 'shadow-[0_0_10px_rgba(34,197,94,0.5)]'
        )}
        style={{
          width: `${percentage}%`,
          backgroundColor: color || 'var(--accent-green)'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
      </div>
    </div>
  );
}

interface GuardianBadgeProps {
  quality: 'high' | 'medium' | 'low' | 'blocked';
  showLabel?: boolean;
  lastVerified?: string;
}

export function GuardianBadge({ quality, showLabel = true, lastVerified }: GuardianBadgeProps) {
  const config = {
    high: { icon: '✓', label: 'Live Data', bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
    medium: { icon: '⚠', label: 'Partial', bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
    low: { icon: '✕', label: 'Limited', bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
    blocked: { icon: '○', label: 'Unverified', bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' }
  };
  
  const { icon, label, bg, text, border } = config[quality];
  
  return (
    <div className={clsx('flex items-center gap-2 px-2 py-1 rounded-md border text-xs', bg, text, border)}>
      <span>{icon}</span>
      {showLabel && <span className="font-medium">{label}</span>}
      {lastVerified && <span className="text-[var(--text-muted)] text-xs ml-1">{lastVerified}</span>}
    </div>
  );
}

interface TeamLogoProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function TeamLogo({ src, name, size = 'md', className }: TeamLogoProps) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  if (!src) {
    return (
      <div className={clsx(
        'w-12 h-12 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-xs font-bold text-[var(--text-muted)]',
        sizes[size],
        className
      )}>
        {name.substring(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      className={clsx(
        'rounded-full object-contain transition-all duration-300 hover:scale-110 hover:rotate-6 hover:drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]',
        sizes[size],
        className
      )}
    />
  );
}

interface GlowBorderProps {
  children: React.ReactNode;
  color?: 'green' | 'blue' | 'yellow' | 'purple';
  intensity?: 'low' | 'medium' | 'high';
  className?: string;
}

export function GlowBorder({ children, color = 'green', intensity = 'medium', className }: GlowBorderProps) {
  const colors = {
    green: 'border-[var(--accent-green)] shadow-[0_0_20px_rgba(34,197,94,0.3)]',
    blue: 'border-[var(--accent-blue)] shadow-[0_0_20px_rgba(59,130,246,0.3)]',
    yellow: 'border-[var(--accent-yellow)] shadow-[0_0_20px_rgba(234,179,8,0.3)]',
    purple: 'border-[var(--accent-purple)] shadow-[0_0_20px_rgba(168,85,247,0.3)]',
  };

  const intensities = {
    low: 'hover:shadow-[0_0_15px_rgba(34,197,94,0.2)]',
    medium: 'hover:shadow-[0_0_25px_rgba(34,197,94,0.4)]',
    high: 'hover:shadow-[0_0_35px_rgba(34,197,94,0.6)]',
  };

  return (
    <div className={clsx(
      'border-2 border-[var(--border-color)] rounded-lg transition-all duration-300',
      colors[color],
      intensities[intensity],
      className
    )}>
      {children}
    </div>
  );
}

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={clsx(
      'bg-gradient-to-r from-[var(--bg-tertiary)] via-[var(--bg-secondary)] to-[var(--bg-tertiary)] bg-[length:200%_100%] animate-shimmer rounded',
      className
    )} />
  );
}
