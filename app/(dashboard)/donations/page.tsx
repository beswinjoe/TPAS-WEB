'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import type { Donation, Member, Role } from '@/types';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import { CAN_MANAGE_DONATIONS } from '@/lib/constants';
import { IndianRupee, CheckCircle2, Clock, Download, TrendingUp, FileText, Printer, Filter, AlertTriangle, Users } from 'lucide-react';
import { toast } from 'sonner';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const CHART_COLORS = ['#22c55e', '#f59e0b'];

export default function DonationsPage() {
  const { member, role } = useAuth();
  const supabase = createClient();
  const canManage = role && CAN_MANAGE_DONATIONS.includes(role as Role);

  const [donations, setDonations] = useState<Donation[]>([]);
  const [allDonations, setAllDonations] = useState<{ year: number; paid: number; pending: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState<number | ''>('');
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  // Pending tracking for Admin/Treasurer
  const [pendingMembers, setPendingMembers] = useState<(Donation & { member?: Member })[]>([]);
  const [showPending, setShowPending] = useState(false);

  useEffect(() => {
    if (member) loadData();
  }, [member]);

  async function loadData() {
    const [myRes, allRes, pendingRes] = await Promise.all([
      supabase.from('donations').select('*').eq('member_id', member!.id).order('year', { ascending: false }),
      supabase.from('donations').select('year, status'),
      canManage
        ? supabase.from('donations').select('*, member:members(name, employee_id, division, phone)').eq('status', 'Pending').eq('year', new Date().getFullYear()).order('created_at')
        : Promise.resolve({ data: [] }),
    ]);
    const myDonations = (myRes.data as Donation[]) ?? [];
    setDonations(myDonations);
    setPendingMembers((pendingRes.data as any) ?? []);

    // Available years
    const years = [...new Set(myDonations.map(d => d.year))].sort((a, b) => b - a);
    setAvailableYears(years);

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

  const filteredDonations = yearFilter ? donations.filter(d => d.year === yearFilter) : donations;
  const totalPaid = filteredDonations.filter(d => d.status === 'Paid').length;
  const totalPending = filteredDonations.filter(d => d.status === 'Pending').length;
  const totalCollected = filteredDonations.filter(d => d.status === 'Paid').reduce((sum, d) => sum + Number(d.amount), 0);
  const pieData = [
    { name: 'Paid', value: totalPaid },
    { name: 'Pending', value: totalPending },
  ].filter(d => d.value > 0);

  function handleDownloadReceipt(donation: Donation) {
    if (donation.status !== 'Paid') {
      toast.error('Receipt only available for paid donations.');
      return;
    }
    const receiptHtml = `
      <html><head><title>TPAS Receipt - ${donation.year}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 40px auto; padding: 40px; }
        .header { text-align: center; border-bottom: 3px solid #0F2044; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { color: #0F2044; margin: 0; font-size: 22px; }
        .header p { color: #666; margin: 5px 0 0; font-size: 13px; }
        .receipt-title { text-align: center; color: #22c55e; font-size: 18px; font-weight: bold; margin-bottom: 25px; }
        .field { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; font-size: 14px; }
        .field .label { color: #666; }
        .field .value { font-weight: 600; color: #333; }
        .amount { font-size: 28px; text-align: center; color: #22c55e; font-weight: bold; margin: 25px 0; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #0F2044; font-size: 11px; color: #999; }
        .badge { display: inline-block; background: #22c55e; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        @media print { body { margin: 0; } }
      </style></head><body>
      <div class="header">
        <h1>TPAS KANNIYAKUMARI</h1>
        <p>Tamil Nadu Public Accounts Service Association</p>
      </div>
      <div class="receipt-title">DONATION RECEIPT</div>
      <div class="field"><span class="label">Receipt No.</span><span class="value">${donation.receipt_number ?? 'N/A'}</span></div>
      <div class="field"><span class="label">Member Name</span><span class="value">${member?.name}</span></div>
      <div class="field"><span class="label">Employee ID</span><span class="value">${member?.employee_id}</span></div>
      <div class="field"><span class="label">Division</span><span class="value">${member?.division ?? '—'}</span></div>
      <div class="field"><span class="label">Year</span><span class="value">${donation.year}</span></div>
      <div class="field"><span class="label">Payment Date</span><span class="value">${formatDate(donation.payment_date)}</span></div>
      <div class="field"><span class="label">Status</span><span class="value"><span class="badge">✓ PAID</span></span></div>
      <div class="amount">${formatCurrency(donation.amount)}</div>
      <div class="footer">
        <p>This is a computer-generated receipt.</p>
        <p>TPAS Kanniyakumari — Membership Portal</p>
      </div>
      <script>window.onload=function(){window.print()}</script>
      </body></html>
    `;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(receiptHtml);
      win.document.close();
    }
    toast.success('Receipt opened!');
  }

  function handlePrintAll() {
    const printContent = `
      <html><head><title>TPAS Donations - ${member?.name}</title>
      <style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#0F2044;color:white}h1{color:#0F2044;font-size:18px}tr:nth-child(even){background:#f9f9f9}.paid{color:#22c55e;font-weight:bold}.pending{color:#f59e0b;font-weight:bold}</style>
      </head><body>
      <h1>TPAS Kanniyakumari - Donation History</h1>
      <p><strong>${member?.name}</strong> (${member?.employee_id})</p>
      <p>Generated: ${new Date().toLocaleDateString()}</p>
      <table>
        <tr><th>Year</th><th>Amount</th><th>Status</th><th>Paid Date</th><th>Receipt No.</th></tr>
        ${filteredDonations.map(d => `<tr><td>${d.year}</td><td>${formatCurrency(d.amount)}</td><td class="${d.status.toLowerCase()}">${d.status}</td><td>${d.payment_date ? formatDate(d.payment_date) : '—'}</td><td>${d.receipt_number ?? '—'}</td></tr>`).join('')}
      </table>
      <p style="margin-top:20px;font-size:11px;color:#999">Total Paid: ${formatCurrency(totalCollected)}</p>
      </body></html>`;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(printContent);
      win.document.close();
      win.print();
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <IndianRupee className="w-4 h-4 text-blue-200" />
            <p className="text-blue-200 text-xs font-medium uppercase tracking-wide">Total Years</p>
          </div>
          <p className="text-3xl font-bold">{loading ? '—' : filteredDonations.length}</p>
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
        <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <IndianRupee className="w-4 h-4 text-teal-200" />
            <p className="text-teal-200 text-xs font-medium uppercase tracking-wide">Total Paid</p>
          </div>
          <p className="text-3xl font-bold">{loading ? '—' : formatCurrency(totalCollected)}</p>
        </div>
      </div>

      {/* Pending Payments Tracking (Admin/Treasurer only) */}
      {canManage && pendingMembers.length > 0 && (
        <div className="bg-card rounded-2xl border border-amber-200 dark:border-amber-800 overflow-hidden">
          <button
            onClick={() => setShowPending(!showPending)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4.5 h-4.5 text-amber-500" />
              <h3 className="font-semibold text-foreground text-sm">Pending Payments — {new Date().getFullYear()}</h3>
              <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">{pendingMembers.length} members</span>
            </div>
            <span className="text-xs text-muted-foreground">{showPending ? 'Hide ▲' : 'Show ▼'}</span>
          </button>
          {showPending && (
            <div className="border-t border-border overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {['Member', 'Employee ID', 'Division', 'Phone', 'Amount'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pendingMembers.map(d => (
                    <tr key={d.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{(d.member as any)?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{(d.member as any)?.employee_id ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{(d.member as any)?.division ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{(d.member as any)?.phone ?? '—'}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-amber-600">{formatCurrency(d.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donation Table */}
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4.5 h-4.5 text-primary" />
              <h3 className="font-semibold text-foreground">Donation History</h3>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value ? Number(e.target.value) : '')}
                className="px-3 py-1.5 bg-muted/50 border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">All Years</option>
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <button onClick={handlePrintAll} className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 border border-border rounded-lg text-xs font-medium text-foreground hover:bg-muted transition-colors">
                <Printer className="w-3 h-3" /> Print
              </button>
            </div>
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
                ) : filteredDonations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-muted-foreground text-sm">No donation records found.</td>
                  </tr>
                ) : (
                  filteredDonations.map((d) => (
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
