import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: 'primary' | 'accent' | 'warning' | 'danger' | 'info';
  subtitle?: string;
}

const colorClasses = {
  primary: {
    bg: 'bg-primary-50',
    icon: 'text-primary-600',
    ring: 'ring-primary-100',
  },
  accent: {
    bg: 'bg-accent-50',
    icon: 'text-accent-600',
    ring: 'ring-accent-100',
  },
  warning: {
    bg: 'bg-amber-50',
    icon: 'text-amber-600',
    ring: 'ring-amber-100',
  },
  danger: {
    bg: 'bg-red-50',
    icon: 'text-red-600',
    ring: 'ring-red-100',
  },
  info: {
    bg: 'bg-cyan-50',
    icon: 'text-cyan-600',
    ring: 'ring-cyan-100',
  },
};

export function StatCard({ label, value, icon: Icon, color = 'primary', subtitle }: StatCardProps) {
  const colors = colorClasses[color];

  return (
    <div className="bg-white rounded-xl border border-surface-200 shadow-[var(--shadow-card)] p-5 transition-shadow duration-200 hover:shadow-[var(--shadow-card-hover)]">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-surface-500 truncate">{label}</p>
          <p className="mt-1 text-2xl font-bold text-surface-900">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-surface-400">{subtitle}</p>
          )}
        </div>
        <div className={`flex-shrink-0 p-2.5 rounded-lg ${colors.bg} ring-1 ${colors.ring}`}>
          <Icon className={`w-5 h-5 ${colors.icon}`} />
        </div>
      </div>
    </div>
  );
}
