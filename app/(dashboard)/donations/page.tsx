'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import type { Donation } from '@/types';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import { IndianRupee, CheckCircle2, Clock, Download, TrendingUp, FileText } from 'lucide-react';
import { toast } from 'sonner';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const CHART_COLORS = ['#22c55e', '#f59e0b'];

export default function DonationsPage() {
  const { member } = useAuth();
  const supabase = createClient();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [allDonations, setAllDonations] = useState<{ year: number; paid: number; pending: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (member) loadData();
  }, [member]);

  async function loadData() {
    const [myRes, allRes] = await Promise.all([
      supabase.from('donations').select('*').eq('member_id', member!.id).order('year', { ascending: false }),
      supabase.from('donations').select('year, status'),
    ]);
    setDonations((myRes.data as Donation[]) ?? []);

    // Aggregate all donations by year
    const yearMap: Record<number, { paid: number; pending: number }> = {};
    for (const d of (allRes.data ?? [])) {
      if (!yearMap[d.year]) yearMap[d.year] = { paid: 0, pending: 0 };
      if (d.status === 'Paid') yearMap[d.year].paid++;
      else yearMap[d.year].pending++;
    }
    const chartData = Object.entries(yearMap)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([year, counts]) => ({ year: Number(year), ...counts }));
    setAllDonations(chartData);
    setLoading(false);
  }

  const totalPaid = donations.filter(d => d.status === 'Paid').length;
  const totalPending = donations.filter(d => d.status === 'Pending').length;
  const pieData = [
    { name: 'Paid', value: totalPaid },
    { name: 'Pending', value: totalPending },
  ].filter(d => d.value > 0);

  function handleDownloadReceipt(donation: Donation) {
    if (donation.status !== 'Paid') {
      toast.error('Receipt only available for paid donations.');
      return;
    }
    // Generate simple receipt text (full PDF via @react-pdf/renderer done in digital-id)
    const content = `
TPAS KANNIYAKUMARI
DONATION RECEIPT
================
Receipt No: ${donation.receipt_number}
Member: ${member?.name}
Employee ID: ${member?.employee_id}
Division: ${member?.division ?? '—'}
Year: ${donation.year}
Amount: ${formatCurrency(donation.amount)}
Payment Date: ${formatDate(donation.payment_date)}
Status: PAID
================
This is a computer-generated receipt.
    `.trim();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TPAS-Receipt-${donation.year}-${donation.receipt_number}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Receipt downloaded!');
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <IndianRupee className="w-4 h-4 text-blue-200" />
            <p className="text-blue-200 text-xs font-medium uppercase tracking-wide">Total Years</p>
          </div>
          <p className="text-3xl font-bold">{loading ? '—' : donations.length}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <p className="text-emerald-200 text-xs font-medium uppercase tracking-wide">Years Paid</p>
          </div>
          <p className="text-3xl font-bold">{loading ? '—' : totalPaid}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-amber-200" />
            <p className="text-amber-200 text-xs font-medium uppercase tracking-wide">Pending</p>
          </div>
          <p className="text-3xl font-bold">{loading ? '—' : totalPending}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donation Table */}
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <FileText className="w-4.5 h-4.5 text-primary" />
            <h3 className="font-semibold text-foreground">Donation History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3">Year</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3">Amount</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3">Paid Date</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3">Receipt</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  Array(4).fill(0).map((_, i) => (
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
                    <td colSpan={6} className="text-center py-10 text-muted-foreground text-sm">No donation records found.</td>
                  </tr>
                ) : (
                  donations.map((d) => (
                    <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-4 font-semibold text-foreground text-sm">{d.year}</td>
                      <td className="px-5 py-4 text-sm text-foreground">{formatCurrency(d.amount)}</td>
                      <td className="px-5 py-4">
                        <span className={cn(
                          'inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full',
                          d.status === 'Paid'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                        )}>
                          {d.status === 'Paid'
                            ? <CheckCircle2 className="w-3 h-3" />
                            : <Clock className="w-3 h-3" />}
                          {d.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-muted-foreground">
                        {d.payment_date ? formatDate(d.payment_date) : (
                          <span className="text-amber-600 text-xs font-medium">Due Dec 31, {d.year}</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs text-muted-foreground font-mono">
                        {d.receipt_number ?? '—'}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => handleDownloadReceipt(d)}
                          disabled={d.status !== 'Paid'}
                          className={cn(
                            'inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all',
                            d.status === 'Paid'
                              ? 'bg-primary/10 text-primary hover:bg-primary/20'
                              : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                          )}
                        >
                          <Download className="w-3 h-3" />
                          Receipt
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Charts Column */}
        <div className="space-y-5">
          {/* Pie Chart */}
          {!loading && pieData.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4.5 h-4.5 text-primary" />
                <h3 className="font-semibold text-foreground text-sm">My Donation Status</h3>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} year(s)`, '']} />
                  <Legend iconType="circle" iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Bar Chart */}
          {!loading && allDonations.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-5">
              <div className="flex items-center gap-2 mb-4">
                <IndianRupee className="w-4.5 h-4.5 text-primary" />
                <h3 className="font-semibold text-foreground text-sm">All Members Collection</h3>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={allDonations} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="paid" name="Paid" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pending" name="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
