import { CheckCircle2, Clock, TrendingUp, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DonationStatus } from '@/types';
import { DONATION_STATUS } from '@/lib/constants';

interface StatusBadgeProps {
  status: DonationStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  if (status === DONATION_STATUS.PAID) {
    return (
      <span className={cn("inline-flex items-center text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 font-semibold", className)}>
        <CheckCircle2 className="w-3 h-3 mr-1" /> Paid
      </span>
    );
  }
  if (status === DONATION_STATUS.PENDING) {
    return (
      <span className={cn("inline-flex items-center text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold", className)}>
        <Clock className="w-3 h-3 mr-1" /> Pending
      </span>
    );
  }
  if (status === DONATION_STATUS.OVERDUE) {
    return (
      <span className={cn("inline-flex items-center text-xs px-2.5 py-1 rounded-full bg-red-100 text-red-700 font-semibold", className)}>
        <AlertTriangle className="w-3 h-3 mr-1" /> Overdue
      </span>
    );
  }
  if (status === DONATION_STATUS.PAYMENT_REPORTED) {
    return (
      <span className={cn("inline-flex items-center text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold", className)}>
        <TrendingUp className="w-3 h-3 mr-1" /> Payment Reported
      </span>
    );
  }
  if (status === DONATION_STATUS.REJECTED) {
    return (
      <span className={cn("inline-flex items-center text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 font-semibold", className)}>
        <XCircle className="w-3 h-3 mr-1" /> Rejected
      </span>
    );
  }
  
  return (
    <span className={cn("inline-flex items-center text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-700", className)}>
      {status}
    </span>
  );
}
