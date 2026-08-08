'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import type { Donation } from '@/types';
import { DONATION_STATUS } from '@/lib/constants';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import { StatusBadge } from '@/components/status-badge';
import { History, Download } from 'lucide-react';
import { toast } from 'sonner';

export default function PaymentHistoryPage() {
  const { member } = useAuth();
  const supabase = createClient();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (member) {
      supabase
        .from('donations')
        .select('*')
        .eq('member_id', member.id)
        .order('year', { ascending: false })
        .then(({ data }) => {
          setDonations((data as Donation[]) ?? []);
          setLoading(false);
        });
    }
  }, [member]);

  const totalPaid = donations.filter(d => d.status === DONATION_STATUS.PAID).reduce((s, d) => s + Number(d.amount), 0);

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-5 text-white shadow-lg">
          <p className="text-blue-200 text-xs font-medium uppercase tracking-wide mb-1">Total Paid</p>
          <p className="text-2xl font-bold">{loading ? '—' : formatCurrency(totalPaid)}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white shadow-lg">
          <p className="text-emerald-200 text-xs font-medium uppercase tracking-wide mb-1">Paid Entries</p>
          <p className="text-2xl font-bold">{loading ? '—' : donations.filter(d => d.status === DONATION_STATUS.PAID).length}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 text-white shadow-lg">
          <p className="text-amber-200 text-xs font-medium uppercase tracking-wide mb-1">Pending / Other</p>
          <p className="text-2xl font-bold">{loading ? '—' : donations.filter(d => d.status !== DONATION_STATUS.PAID).length}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <History className="w-4.5 h-4.5 text-primary" />
          <h3 className="font-semibold text-foreground">Complete Payment History</h3>
        </div>
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
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i}>
                    {Array(6).fill(0).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-muted rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : donations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                    No payment records found.
                  </td>
                </tr>
              ) : (
                donations.map((d) => (
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
                          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all"
                        >
                          <Download className="w-3 h-3" />
                          Receipt
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && donations.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/20">
                  <td className="px-5 py-3 font-bold text-foreground text-sm">Total</td>
                  <td className="px-5 py-3 font-bold text-foreground text-sm">{formatCurrency(totalPaid)}</td>
                  <td colSpan={4} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
