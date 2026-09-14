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
      <span className={cn("inline-flex items-center text-xs px-2.5 py-1 rounded-full bg-muted text-foreground font-semibold border border-border", className)}>
        <CheckCircle2 className="w-3 h-3 mr-1" /> Paid
      </span>
    );
  }
  if (status === DONATION_STATUS.PENDING) {
    return (
      <span className={cn("inline-flex items-center text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-semibold border border-border", className)}>
        <Clock className="w-3 h-3 mr-1" /> Pending
      </span>
    );
  }
  if (status === DONATION_STATUS.OVERDUE) {
    return (
      <span className={cn("inline-flex items-center text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-semibold border border-border", className)}>
        <AlertTriangle className="w-3 h-3 mr-1" /> Overdue
      </span>
    );
  }
  if (status === DONATION_STATUS.PAYMENT_REPORTED) {
    return (
      <span className={cn("inline-flex items-center text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-semibold border border-border", className)}>
        <TrendingUp className="w-3 h-3 mr-1" /> Payment Reported
      </span>
    );
  }
  if (status === DONATION_STATUS.REJECTED) {
    return (
      <span className={cn("inline-flex items-center text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-semibold border border-border", className)}>
        <XCircle className="w-3 h-3 mr-1" /> Rejected
      </span>
    );
  }
  
  return (
    <span className={cn("inline-flex items-center text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border", className)}>
      {status}
    </span>
  );
}
