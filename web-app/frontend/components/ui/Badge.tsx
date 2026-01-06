'use client';

import React from 'react';
import { 
  ArrowLeftRight, 
  Megaphone, 
  DollarSign, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

type BadgeVariant = 'default' | 'active' | 'delinquent' | 'trade' | 'system' | 'finance' | 'outline';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  icon?: React.ReactNode;
  pulse?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-muted text-muted-foreground border border-border',
  active: 'bg-green-500/15 text-green-400 border border-green-500/30',
  delinquent: 'bg-jkap-red-500/15 text-jkap-red-400 border border-jkap-red-500/30',
  trade: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  system: 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
  finance: 'bg-green-500/15 text-green-400 border border-green-500/30',
  outline: 'bg-transparent text-jkap-red-500 border-2 border-jkap-red-500',
};

export function Badge({
  children,
  variant = 'default',
  className = '',
  icon,
  pulse = false,
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full
        ${variantStyles[variant]}
        ${pulse ? 'relative' : ''}
        ${className}
      `}
    >
      {pulse && (
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-jkap-red-500 rounded-full animate-pulse" />
      )}
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  );
}

// Subscription status badge with Lucide icons
interface SubscriptionBadgeProps {
  status: 'active' | 'delinquent';
  className?: string;
}

export function SubscriptionBadge({ status, className = '' }: SubscriptionBadgeProps) {
  return (
    <Badge
      variant={status}
      className={className}
      icon={
        status === 'active' 
          ? <CheckCircle className="w-3 h-3" /> 
          : <AlertCircle className="w-3 h-3" />
      }
    >
      {status === 'active' ? 'Season Pass (Paid)' : 'Payment Required'}
    </Badge>
  );
}

// Notification type badge with Lucide icons
interface NotificationBadgeProps {
  type: 'trade' | 'system' | 'finance';
  className?: string;
}

export function NotificationBadge({ type, className = '' }: NotificationBadgeProps) {
  const labels = {
    trade: 'Trade',
    system: 'System',
    finance: 'Finance',
  };

  const icons = {
    trade: <ArrowLeftRight className="w-3 h-3" />,
    system: <Megaphone className="w-3 h-3" />,
    finance: <DollarSign className="w-3 h-3" />,
  };

  return (
    <Badge variant={type} className={className} icon={icons[type]}>
      {labels[type]}
    </Badge>
  );
}

// Streak badge with Lucide icons
interface StreakBadgeProps {
  streak: string;
  type: 'W' | 'L';
  className?: string;
}

export function StreakBadge({ streak, type, className = '' }: StreakBadgeProps) {
  return (
    <Badge
      variant={type === 'W' ? 'active' : 'delinquent'}
      className={className}
      icon={
        type === 'W' 
          ? <TrendingUp className="w-3 h-3" /> 
          : <TrendingDown className="w-3 h-3" />
      }
    >
      {streak}
    </Badge>
  );
}

export default Badge;
