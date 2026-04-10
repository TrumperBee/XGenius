import { clsx } from 'clsx';
import { LucideIcon } from 'lucide-react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={clsx('bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg', className)}>
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
    success: 'bg-[var(--accent-green)]/20 text-[var(--accent-green)]',
    warning: 'bg-[var(--accent-yellow)]/20 text-[var(--accent-yellow)]',
    danger: 'bg-[var(--accent-red)]/20 text-[var(--accent-red)]',
    info: 'bg-[var(--accent-blue)]/20 text-[var(--accent-blue)]',
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
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ children, variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  const variants = {
    primary: 'bg-[var(--accent-blue)] hover:bg-[#2563eb] text-white',
    secondary: 'bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)] text-[var(--text-primary)]',
    ghost: 'bg-transparent hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={clsx(
        'rounded-md font-medium transition-colors disabled:opacity-50',
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
  className?: string;
}

export function ProgressBar({ value, max = 100, color, className }: ProgressBarProps) {
  const percentage = Math.min(100, (value / max) * 100);
  
  return (
    <div className={clsx('h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden', className)}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${percentage}%`,
          backgroundColor: color || 'var(--accent-blue)'
        }}
      />
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
