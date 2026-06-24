'use client';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  suspended: 'bg-red-50 text-red-700 border-red-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  degraded: 'bg-orange-50 text-orange-700 border-orange-200',
  resolved: 'bg-blue-50 text-blue-700 border-blue-200',
  free: 'bg-gray-50 text-gray-700 border-gray-200',
  pro: 'bg-violet-50 text-violet-700 border-violet-200',
  enterprise: 'bg-blue-50 text-blue-700 border-blue-200',
  outage: 'bg-red-50 text-red-700 border-red-200',
  maintenance: 'bg-blue-50 text-blue-700 border-blue-200',
  draft: 'bg-gray-50 text-gray-700 border-gray-200',
  owner: 'bg-violet-50 text-violet-700 border-violet-200',
  admin: 'bg-blue-50 text-blue-700 border-blue-200',
  member: 'bg-gray-50 text-gray-700 border-gray-200',
  agency: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  freelancer: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  platform: 'bg-purple-50 text-purple-700 border-purple-200',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  unpaid: 'bg-amber-50 text-amber-700 border-amber-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
  trialing: 'bg-blue-50 text-blue-700 border-blue-200',
  incomplete: 'bg-orange-50 text-orange-700 border-orange-200',
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const normalized = status.toLowerCase();
  const styles = STATUS_STYLES[normalized] ?? 'bg-gray-50 text-gray-700 border-gray-200';
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${styles} ${sizeClass}`}
    >
      {normalized === 'active' || normalized === 'approved' || normalized === 'resolved' ? (
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      ) : null}
      {status}
    </span>
  );
}
