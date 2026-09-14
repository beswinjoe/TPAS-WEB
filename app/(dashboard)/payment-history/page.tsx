'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/client';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { useAuth } from '@/lib/auth-context';
import type { Donation } from '@/types';
import { DONATION_STATUS } from '@/lib/constants';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import { StatusBadge } from '@/components/status-badge';
import { History, Download, IndianRupee } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { TableSkeleton } from '@/components/ui/skeletons';

export default function PaymentHistoryPage() {
  const { member } = useAuth();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (member) {
        setLoading(true);
        setError(null);
        try {
          const snap = await getDocs(query(collection(db, 'donations'), where('member_id', '==', member.id), orderBy('year', 'desc')));
          setDonations(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Donation[]);
        } catch (error) {
          setError('Unable to load payment history.');
        }
        setLoading(false);
      }
    };
    loadData();
  }, [member]);

  const totalPaid = donations.filter(d => d.status === DONATION_STATUS.PAID).reduce((s, d) => s + Number(d.amount), 0);

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide mb-1">Total Paid</p>
          {loading ? <div className="h-7 w-20 bg-muted rounded animate-pulse" /> : <p className="text-xl font-bold text-foreground">{formatCurrency(totalPaid)}</p>}
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide mb-1">Paid Entries</p>
          {loading ? <div className="h-7 w-12 bg-muted rounded animate-pulse" /> : <p className="text-xl font-bold text-foreground">{donations.filter(d => d.status === DONATION_STATUS.PAID).length}</p>}
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide mb-1">Pending / Other</p>
          {loading ? <div className="h-7 w-12 bg-muted rounded animate-pulse" /> : <p className="text-xl font-bold text-foreground">{donations.filter(d => d.status !== DONATION_STATUS.PAID).length}</p>}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <History className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Complete Payment History</h3>
        </div>
        {error && !loading ? (
          <ErrorState message={error} onRetry={() => window.location.reload()} />
        ) : loading ? (
          <TableSkeleton columns={6} rows={5} />
        ) : donations.length === 0 ? (
          <EmptyState icon={IndianRupee} title="No payment records" description="You have not made any payments yet." className="py-12" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {['Year', 'Amount', 'Payment Date', 'Status', 'Receipt No.', 'Download'].map((h) => (
                    <th key={h} className={cn(
                      'text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3',
                      h === 'Download' ? 'text-right' : 'text-left'
                    )}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {donations.map((d) => (
                  <tr key={d.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-4 font-bold text-foreground">{d.year}</td>
                    <td className="px-5 py-4 text-sm text-foreground">{formatCurrency(d.amount)}</td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">
                      {d.payment_date ? formatDate(d.payment_date) : '—'}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground font-mono">
                      {d.receipt_number ?? '—'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {d.status === DONATION_STATUS.PAID && (
                        <button
                          onClick={() => toast.info('Download from Donations page')}
                          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-muted text-muted-foreground hover:text-foreground border border-border transition-all"
                        >
                          <Download className="w-3 h-3" />
                          Receipt
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/20">
                  <td className="px-5 py-3 font-bold text-foreground text-sm">Total</td>
                  <td className="px-5 py-3 font-bold text-foreground text-sm">{formatCurrency(totalPaid)}</td>
                  <td colSpan={4} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
