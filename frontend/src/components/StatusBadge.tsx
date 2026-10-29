import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  customLabel?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md', customLabel }) => {
  const normalized = (status || '').toLowerCase().replace(/[\s-]/g, '_');
  
  let label = customLabel || status;
  let bgClass = 'bg-slate-50 text-slate-700 border-slate-200/80';
  let dotClass = 'bg-slate-400';
  let isPulsing = false;

  switch (normalized) {
    case 'my_action':
      label = customLabel || 'My Action';
      bgClass = 'bg-blue-50/80 text-blue-700 border-blue-200/80 shadow-[0_1px_2px_rgba(37,99,235,0.06)]';
      dotClass = 'bg-blue-600';
      isPulsing = true;
      break;
    case 'in_progress':
      label = customLabel || 'In Progress';
      bgClass = 'bg-sky-50/80 text-sky-700 border-sky-200/80 shadow-[0_1px_2px_rgba(2,132,199,0.06)]';
      dotClass = 'bg-sky-500';
      isPulsing = true;
      break;
    case 'approval':
    case 'sign_off':
    case 'final_sign_off':
      label = customLabel || 'Final Sign-off';
      bgClass = 'bg-purple-50/80 text-purple-700 border-purple-200/80 shadow-[0_1px_2px_rgba(147,51,234,0.06)]';
      dotClass = 'bg-purple-600';
      isPulsing = true;
      break;
    case 'review':
    case 'pending_review':
    case 'under_review':
      label = customLabel || 'Under Review';
      bgClass = 'bg-indigo-50/80 text-indigo-700 border-indigo-200/80 shadow-[0_1px_2px_rgba(99,102,241,0.06)]';
      dotClass = 'bg-indigo-600';
      isPulsing = true;
      break;
    case 'completed':
      label = customLabel || 'Completed';
      bgClass = 'bg-emerald-50/80 text-emerald-700 border-emerald-200/80 shadow-[0_1px_2px_rgba(5,150,105,0.06)]';
      dotClass = 'bg-emerald-500';
      break;
    case 'on_hold':
      label = customLabel || 'On Hold';
      bgClass = 'bg-amber-50/80 text-amber-700 border-amber-200/80 shadow-[0_1px_2px_rgba(217,119,6,0.06)]';
      dotClass = 'bg-amber-500';
      break;
    case 'clarification_requested':
    case 'details_requested':
      label = customLabel || 'Details Requested';
      bgClass = 'bg-amber-50/80 text-amber-800 border-amber-300 shadow-[0_1px_2px_rgba(217,119,6,0.06)]';
      dotClass = 'bg-amber-500';
      isPulsing = true;
      break;
    case 'post_comment':
    case 'returned':
    case 'rejected':
      label = customLabel || 'Needs Correction';
      bgClass = 'bg-rose-50/80 text-rose-700 border-rose-200/80 shadow-[0_1px_2px_rgba(225,29,72,0.06)]';
      dotClass = 'bg-rose-500';
      isPulsing = true;
      break;
    case 'cancelled':
      label = customLabel || 'Cancelled';
      bgClass = 'bg-slate-100 text-slate-500 border-slate-200';
      dotClass = 'bg-slate-400';
      break;
    case 'pending':
      label = customLabel || 'Pending';
      bgClass = 'bg-slate-100/80 text-slate-700 border-slate-200/80';
      dotClass = 'bg-slate-400';
      break;
    default:
      label = customLabel || (status ? status.replace('_', ' ') : 'Unknown');
      break;
  }

  const sizeClass =
    size === 'sm'
      ? 'px-2.5 py-0.5 text-xs font-semibold'
      : size === 'lg'
      ? 'px-3.5 py-1.5 text-sm font-semibold'
      : 'px-3 py-1 text-xs font-semibold';

  return (
    <span
      className={`inline-flex items-center rounded-full border ${bgClass} ${sizeClass} tracking-tight capitalize select-none transition-colors`}
    >
      <span className="relative flex h-2 w-2 mr-1.5 shrink-0">
        {isPulsing && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotClass}`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${dotClass}`} />
      </span>
      <span>{label}</span>
    </span>
  );
};

interface PriorityBadgeProps {
  priority: string;
  size?: 'sm' | 'md';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, size = 'md' }) => {
  const p = (priority || 'medium').toLowerCase();
  
  let label = 'Medium';
  let badgeClass = 'bg-amber-50 text-amber-700 border-amber-200/80';
  let dotColor = 'bg-amber-500';

  if (p === 'urgent') {
    label = 'Urgent';
    badgeClass = 'bg-rose-50 text-rose-700 border-rose-200/80';
    dotColor = 'bg-rose-600 animate-pulse';
  } else if (p === 'high') {
    label = 'High';
    badgeClass = 'bg-orange-50 text-orange-700 border-orange-200/80';
    dotColor = 'bg-orange-500';
  } else if (p === 'low') {
    label = 'Low';
    badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
    dotColor = 'bg-emerald-500';
  }

  const sizeClass = size === 'sm' ? 'px-2.5 py-0.5 text-xs font-semibold' : 'px-3 py-1 text-xs font-semibold';

  return (
    <span
      className={`inline-flex items-center rounded-full border ${badgeClass} ${sizeClass} tracking-tight select-none shadow-2xs`}
    >
      <span className={`w-2 h-2 rounded-full mr-1.5 ${dotColor}`} />
      <span>{label}</span>
    </span>
  );
};
