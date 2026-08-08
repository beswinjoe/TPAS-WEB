'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import type { Donation, Member, Role } from '@/types';
import { formatDate, formatCurrency, cn, generateReceiptNumber } from '@/lib/utils';
import { CAN_MANAGE_DONATIONS, DONATION_STATUS } from '@/lib/constants';
import { StatusBadge } from '@/components/status-badge';
import { IndianRupee, CheckCircle2, Clock, Download, TrendingUp, FileText, Printer, AlertTriangle, Users, Check, X, Search, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const CHART_COLORS = ['#22c55e', '#f59e0b', '#3b82f6', '#ef4444'];

export default function DonationsPage() {
  const { member, role } = useAuth();
  const supabase = createClient();
  const canManage = role && CAN_MANAGE_DONATIONS.includes(role as Role);

  const [activeTab, setActiveTab] = useState<'my' | 'verification' | 'history'>('my');

  // Member Data
  const [myDonations, setMyDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);

  // Verification Data
  const [reportedPayments, setReportedPayments] = useState<(Donation & { member?: Member })[]>([]);
  
  // History Data
  const [allDonations, setAllDonations] = useState<(Donation & { member?: Member; verifier?: Member })[]>([]);
  const [historyTab, setHistoryTab] = useState<'ALL' | 'pending' | 'payment_reported' | 'paid' | 'rejected' | 'overdue'>('ALL');
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('');
  
  // Modals
  const [reportModal, setReportModal] = useState<Donation | null>(null);
  const [reportForm, setReportForm] = useState({ date: new Date().toISOString().split('T')[0], method: 'Bank Transfer', reference: '', proof: '', notes: '' });
  const [reporting, setReporting] = useState(false);

  const [verifyModal, setVerifyModal] = useState<Donation | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  const [createModal, setCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ member_id: '', year: new Date().getFullYear(), amount: 500, title: '', description: '', due_date: `${new Date().getFullYear()}-12-31` });
  const [memberSearch, setMemberSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Partial<Member>[]>([]);
  const [searching, setSearching] = useState(false);

  const loadData = useCallback(async () => {
    if (!member) return;
    setLoading(true);

    if (activeTab === 'verification' && canManage) {
      const { data, error } = await supabase.from('donations')
        .select('*, member:members!member_id(name, employee_id, division, phone)')
        .eq('status', DONATION_STATUS.PAYMENT_REPORTED)
        .order('reported_at', { ascending: false });
      if (error) {
        console.error('Verification query failed:', error);
        toast.error(`Unable to load verifications: ${error.message}`);
      }
      setReportedPayments((data as any) || []);
    }

    if (activeTab === 'history' && canManage) {
      const { data, error } = await supabase.from('donations')
        .select('*, member:members!member_id(name, employee_id, division, phone), verifier:members!verified_by(name)')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('All donations query failed:', error);
        toast.error(`Unable to load all donations: ${error.message}`);
      }
      setAllDonations((data as any) || []);
    }

    if (activeTab === 'my') {
      const { data, error } = await supabase.from('donations')
        .select('*, verifier:members!verified_by(name)')
        .eq('member_id', member.id)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('My donations query failed:', error);
        toast.error(`Unable to load your donations: ${error.message}`);
      }
      setMyDonations((data as any) || []);
    }
    setLoading(false);
  }, [activeTab, canManage, member, supabase]);

  useEffect(() => {
    if (member) loadData();
  }, [member, activeTab, loadData]);

  // --- Member Actions ---

  async function submitReportPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!reportModal) return;
    setReporting(true);

    const { error } = await supabase.from('donations').update({
      status: DONATION_STATUS.PAYMENT_REPORTED,
      payment_date: reportForm.date,
      payment_method: reportForm.method,
      transaction_reference: reportForm.reference,
      payment_proof_url: reportForm.proof,
      description: reportForm.notes ? `${reportModal.description || ''}\nMember Notes: ${reportForm.notes}` : reportModal.description,
      reported_at: new Date().toISOString(),
      reported_by: member!.id
    }).eq('id', reportModal.id);

    if (error) {
      toast.error('Failed to report payment');
    } else {
      await supabase.from('activity_logs').insert({ member_id: member!.id, action: 'REPORT_PAYMENT', details: `Payment reported for ${reportModal.title || reportModal.year}` });
      toast.success('Payment reported successfully');
      setReportModal(null);
      loadData();
    }
    setReporting(false);
  }

  // --- Officer Actions ---

  async function handleConfirmPayment(donationId: string) {
    if (!verifyModal) return;
    setVerifying(true);
    
    const receipt_number = generateReceiptNumber(verifyModal.member_id, verifyModal.year);
    
    const { error } = await supabase.from('donations').update({
      status: DONATION_STATUS.PAID,
      receipt_number,
      verified_by: member!.id,
      verified_at: new Date().toISOString()
    }).eq('id', donationId);

    if (error) {
      toast.error('Failed to confirm payment');
    } else {
      await supabase.from('activity_logs').insert({ member_id: member!.id, action: 'VERIFY_PAYMENT', details: `Payment confirmed for ${(verifyModal as any).member?.name} (${(verifyModal as any).member?.employee_id})` });
      toast.success('Payment confirmed and receipt generated.');
      setVerifyModal(null);
      loadData();
    }
    setVerifying(false);
  }

  async function handleRejectPayment(donationId: string) {
    if (!verifyModal || !rejectReason.trim()) {
      toast.error('Rejection reason is required.');
      return;
    }
    setVerifying(true);
    
    const { error } = await supabase.from('donations').update({
      status: DONATION_STATUS.REJECTED,
      rejection_reason: rejectReason.trim(),
      rejected_by: member!.id,
      rejected_at: new Date().toISOString()
    }).eq('id', donationId);

    if (error) {
      toast.error('Failed to reject payment');
    } else {
      await supabase.from('activity_logs').insert({ member_id: member!.id, action: 'REJECT_PAYMENT', details: `Payment rejected for ${(verifyModal as any).member?.name}. Reason: ${rejectReason}` });
      toast.success('Payment rejected.');
      setVerifyModal(null);
      setShowRejectInput(false);
      setRejectReason('');
      loadData();
    }
    setVerifying(false);
  }

  // Search Members for Create Donation
  useEffect(() => {
    if (!memberSearch || memberSearch.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase.from('members')
        .select('id, name, employee_id')
        .or(`name.ilike.%${memberSearch}%,employee_id.ilike.%${memberSearch}%`)
        .limit(10);
      setSearchResults(data || []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [memberSearch]);

  async function handleCreateDonation(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.member_id || !createForm.title || !createForm.year || !createForm.amount || !createForm.due_date) {
      toast.error('Please complete all required fields.');
      return;
    }
    setCreating(true);

    const { error } = await supabase.from('donations').insert({
      member_id: createForm.member_id,
      year: createForm.year,
      amount: createForm.amount,
      title: createForm.title,
      description: createForm.description,
      due_date: createForm.due_date,
      status: DONATION_STATUS.PENDING,
      created_by: member!.id
    });

    if (error) {
      toast.error('Failed to create donation request.');
    } else {
      await supabase.from('activity_logs').insert({ member_id: member!.id, action: 'CREATE_DONATION', details: `Created donation request: ${createForm.title}` });
      toast.success('Donation request created.');
      setCreateModal(false);
      loadData();
    }
    setCreating(false);
  }

  // --- Render Helpers ---

  const myFiltered = yearFilter ? myDonations.filter(d => d.year.toString() === yearFilter) : myDonations;
  const myTotalPaid = myFiltered.filter(d => d.status === DONATION_STATUS.PAID).length;
  const myTotalPending = myFiltered.filter(d => d.status === DONATION_STATUS.PENDING || d.status === DONATION_STATUS.OVERDUE).length;
  const myTotalCollected = myFiltered.filter(d => d.status === DONATION_STATUS.PAID).reduce((sum, d) => sum + Number(d.amount), 0);
  
  const historyFiltered = useMemo(() => {
    return allDonations.filter(d => {
      if (historyTab !== 'ALL' && d.status !== historyTab) return false;
      if (yearFilter && d.year.toString() !== yearFilter) return false;
      if (search) {
        const m = d.member as any;
        const q = search.toLowerCase();
        if (!m?.name.toLowerCase().includes(q) && !m?.employee_id.toLowerCase().includes(q) && !d.receipt_number?.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [allDonations, historyTab, search, yearFilter]);

  const uniqueYears = [...new Set((activeTab === 'my' ? myDonations : allDonations).map(d => d.year))].sort((a, b) => b - a);

  function handleDownloadReceipt(donation: Donation) {
    if (donation.status !== DONATION_STATUS.PAID) return;
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
      <div class="field"><span class="label">Member Name</span><span class="value">${(donation.member as any)?.name ?? member?.name}</span></div>
      <div class="field"><span class="label">Employee ID</span><span class="value">${(donation.member as any)?.employee_id ?? member?.employee_id}</span></div>
      <div class="field"><span class="label">Donation</span><span class="value">${donation.title || `Annual Donation ${donation.year}`}</span></div>
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
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit flex-wrap">
        <button onClick={() => { setActiveTab('my'); setYearFilter(''); }} className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all', activeTab === 'my' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
          <FileText className="w-4 h-4" /> My Donations
        </button>
        {canManage && (
          <>
            <button onClick={() => { setActiveTab('verification'); setYearFilter(''); }} className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all', activeTab === 'verification' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
              <CheckCircle2 className="w-4 h-4" /> Verifications {reportedPayments.length > 0 && <span className="ml-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs">{reportedPayments.length}</span>}
            </button>
            <button onClick={() => { setActiveTab('history'); setYearFilter(''); }} className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all', activeTab === 'history' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
              <TrendingUp className="w-4 h-4" /> All Donations (Admin)
            </button>
          </>
        )}
      </div>

      {/* --- MY DONATIONS TAB --- */}
      {activeTab === 'my' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-5 text-white shadow-lg">
              <p className="text-blue-200 text-xs font-medium uppercase tracking-wide mb-1">Total Entries</p>
              <p className="text-3xl font-bold">{loading ? '—' : myFiltered.length}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white shadow-lg">
              <p className="text-emerald-200 text-xs font-medium uppercase tracking-wide mb-1">Years Paid</p>
              <p className="text-3xl font-bold">{loading ? '—' : myTotalPaid}</p>
            </div>
            <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 text-white shadow-lg">
              <p className="text-amber-200 text-xs font-medium uppercase tracking-wide mb-1">Pending</p>
              <p className="text-3xl font-bold">{loading ? '—' : myTotalPending}</p>
            </div>
            <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg">
              <p className="text-teal-200 text-xs font-medium uppercase tracking-wide mb-1">Total Paid</p>
              <p className="text-3xl font-bold">{loading ? '—' : formatCurrency(myTotalCollected)}</p>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-foreground">My Donation History</h3>
              <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} className="px-3 py-1.5 bg-muted border border-border rounded-lg text-xs">
                <option value="">All Years</option>
                {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-5 py-3">Donation</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-5 py-3">Amount</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-5 py-3">Status</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-5 py-3">Date / Info</th>
                    <th className="text-right text-xs font-semibold text-muted-foreground uppercase px-5 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                     <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
                  ) : myFiltered.length === 0 ? (
                     <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No records found.</td></tr>
                  ) : myFiltered.map(d => (
                    <tr key={d.id} className="hover:bg-muted/20">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-sm">{d.title || `Annual Donation ${d.year}`}</p>
                        <p className="text-xs text-muted-foreground">Year: {d.year}</p>
                      </td>
                      <td className="px-5 py-4 text-sm">{formatCurrency(d.amount)}</td>
                      <td className="px-5 py-4"><StatusBadge status={d.status} /></td>
                      <td className="px-5 py-4">
                        {d.status === DONATION_STATUS.REJECTED && d.rejection_reason && (
                          <div className="text-xs text-red-600">Reason: {d.rejection_reason}</div>
                        )}
                        {d.status === DONATION_STATUS.PAID && d.payment_date && <div className="text-xs text-muted-foreground">Paid: {formatDate(d.payment_date)}</div>}
                        {d.status === DONATION_STATUS.PAYMENT_REPORTED && d.payment_date && <div className="text-xs text-blue-600">Reported: {formatDate(d.payment_date)}</div>}
                        {(d.status === DONATION_STATUS.PENDING || d.status === DONATION_STATUS.OVERDUE) && d.due_date && <div className="text-xs text-amber-600">Due: {formatDate(d.due_date)}</div>}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {(d.status === DONATION_STATUS.PENDING || d.status === DONATION_STATUS.OVERDUE || d.status === DONATION_STATUS.REJECTED) && (
                          <button onClick={() => setReportModal(d)} className="px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-xs font-medium transition-colors">
                            Report Payment
                          </button>
                        )}
                        {d.status === DONATION_STATUS.PAID && (
                          <button onClick={() => handleDownloadReceipt(d)} className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-xs font-medium transition-colors">
                            Receipt
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- VERIFICATIONS TAB --- */}
      {activeTab === 'verification' && canManage && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Payments Awaiting Verification</h3>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{reportedPayments.length} reported</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Member</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Donation</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Reported On</th>
                    <th className="text-right text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                     <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
                  ) : reportedPayments.length === 0 ? (
                     <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">No pending verifications.</td></tr>
                  ) : reportedPayments.map(d => (
                    <tr key={d.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium">{(d.member as any)?.name}</p>
                        <p className="text-xs text-muted-foreground">{(d.member as any)?.employee_id}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold">{d.title || `Annual Donation ${d.year}`}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(d.amount)}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {d.reported_at ? formatDate(d.reported_at) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => { setVerifyModal(d); setShowRejectInput(false); setRejectReason(''); }} className="px-3 py-1.5 border border-border hover:bg-muted rounded-lg text-xs font-medium transition-colors">
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- HISTORY TAB (ADMIN) --- */}
      {activeTab === 'history' && canManage && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <div className="flex gap-2 bg-muted p-1 rounded-xl overflow-x-auto scrollbar-hide">
              {['ALL', DONATION_STATUS.PENDING, DONATION_STATUS.PAYMENT_REPORTED, DONATION_STATUS.PAID, DONATION_STATUS.REJECTED, DONATION_STATUS.OVERDUE].map(s => (
                <button key={s} onClick={() => setHistoryTab(s as any)} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors', historyTab === s ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                  {s === DONATION_STATUS.PAYMENT_REPORTED ? 'REPORTED' : s === 'ALL' ? 'ALL' : s.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee..." className="pl-9 pr-3 py-1.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <button onClick={() => setCreateModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 gradient-primary text-white text-sm font-medium rounded-xl hover:opacity-90 shadow-sm">
                <Plus className="w-4 h-4" /> Create Request
              </button>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="overflow-x-auto max-h-[600px] scrollbar-thin">
              <table className="w-full">
                <thead className="sticky top-0 bg-muted/95 backdrop-blur-md z-10 border-b border-border">
                  <tr>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Member</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Donation</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Status</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Info</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Verified By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
                  ) : historyFiltered.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No records found.</td></tr>
                  ) : historyFiltered.map(d => (
                    <tr key={d.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium">{(d.member as any)?.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{(d.member as any)?.employee_id}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold">{d.title || `Year ${d.year}`}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(d.amount)}</p>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {d.status === DONATION_STATUS.PAID && d.payment_date && <p>Paid: {formatDate(d.payment_date)}</p>}
                        {d.status === DONATION_STATUS.PAYMENT_REPORTED && d.payment_date && <p className="text-blue-500">Reported: {formatDate(d.payment_date)}</p>}
                        {d.receipt_number && <p className="font-mono">Receipt: {d.receipt_number}</p>}
                        {d.status === DONATION_STATUS.REJECTED && d.rejection_reason && <p className="text-red-500 truncate max-w-[150px]" title={d.rejection_reason}>Reason: {d.rejection_reason}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {d.verified_at ? (
                          <>
                            <p>{(d.verifier as any)?.name}</p>
                            <p>{formatDate(d.verified_at)}</p>
                          </>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      
      {/* Report Payment Modal */}
      {reportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setReportModal(null)}>
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-1">Report Payment</h2>
            <p className="text-sm text-muted-foreground mb-5">{reportModal.title || `Annual Donation ${reportModal.year}`} • {formatCurrency(reportModal.amount)}</p>
            <form onSubmit={submitReportPayment} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Payment Date *</label>
                <input type="date" required value={reportForm.date} onChange={e => setReportForm(f => ({ ...f, date: e.target.value }))} className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Payment Method *</label>
                <select required value={reportForm.method} onChange={e => setReportForm(f => ({ ...f, method: e.target.value }))} className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:border-primary">
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Transaction / Reference Number</label>
                <input type="text" value={reportForm.reference} onChange={e => setReportForm(f => ({ ...f, reference: e.target.value }))} placeholder="e.g. UTR Number" className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Notes (Optional)</label>
                <textarea value={reportForm.notes} onChange={e => setReportForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any additional information..." className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:border-primary resize-none h-20" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setReportModal(null)} className="flex-1 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted">Cancel</button>
                <button type="submit" disabled={reporting} className="flex-1 py-2 gradient-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-70 flex items-center justify-center">
                  {reporting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Verify Modal */}
      {verifyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => { setVerifyModal(null); setShowRejectInput(false); }}>
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">Verify Payment</h2>
            
            <div className="bg-muted/50 rounded-xl p-4 space-y-3 mb-5 border border-border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Member</span>
                <span className="font-semibold text-right">{(verifyModal as any).member?.name}<br/><span className="text-xs text-muted-foreground font-mono">{(verifyModal as any).member?.employee_id}</span></span>
              </div>
              <div className="flex justify-between text-sm border-t border-border pt-2">
                <span className="text-muted-foreground">Donation</span>
                <span className="font-semibold">{verifyModal.title || verifyModal.year}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-border pt-2">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold text-emerald-600">{formatCurrency(verifyModal.amount)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-border pt-2">
                <span className="text-muted-foreground">Method / Ref</span>
                <span className="font-medium text-right">{verifyModal.payment_method || '—'}<br/><span className="text-xs text-muted-foreground">{verifyModal.transaction_reference || 'No Ref'}</span></span>
              </div>
              <div className="flex justify-between text-sm border-t border-border pt-2">
                <span className="text-muted-foreground">Payment Date</span>
                <span className="font-medium">{verifyModal.payment_date ? formatDate(verifyModal.payment_date) : '—'}</span>
              </div>
            </div>

            {showRejectInput ? (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Reason for Rejection *</label>
                  <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="e.g. Payment reference could not be verified." className="w-full px-3 py-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg text-sm focus:outline-none focus:border-red-500 resize-none h-20" />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowRejectInput(false)} className="flex-1 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted">Cancel</button>
                  <button onClick={() => handleRejectPayment(verifyModal.id)} disabled={verifying || !rejectReason.trim()} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                    {verifying ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirm Rejection'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <button onClick={() => setShowRejectInput(true)} className="flex-1 py-2 border border-red-200 text-red-600 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors">
                  Reject
                </button>
                <button onClick={() => { if(confirm('Confirm this payment as received?')) handleConfirmPayment(verifyModal.id); }} disabled={verifying} className="flex-[2] py-2 gradient-primary text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90">
                  {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Confirm Payment</>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Donation Request Modal */}
      {createModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setCreateModal(false)}>
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">Create Donation Request</h2>
            <form onSubmit={handleCreateDonation} className="space-y-4">
              
              <div className="relative">
                <label className="text-xs font-medium text-muted-foreground block mb-1">Search Member *</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input 
                    type="text" 
                    value={memberSearch}
                    onChange={e => {
                      setMemberSearch(e.target.value);
                      if(createForm.member_id) setCreateForm(f => ({ ...f, member_id: '' })); // clear selection if typing
                    }}
                    placeholder="Search by name or Employee ID (e.g. 1234455)" 
                    className={cn("w-full pl-9 pr-3 py-2 bg-muted/50 border rounded-lg text-sm focus:outline-none focus:border-primary", createForm.member_id ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20' : 'border-border')} 
                  />
                  {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />}
                </div>
                
                {searchResults.length > 0 && !createForm.member_id && (
                  <div className="absolute w-full mt-1 bg-card border border-border rounded-lg shadow-xl z-20 max-h-48 overflow-y-auto">
                    {searchResults.map(m => (
                      <button 
                        key={m.id} 
                        type="button"
                        onClick={() => {
                          setCreateForm(f => ({ ...f, member_id: m.id || '' }));
                          setMemberSearch(`${m.name} (${m.employee_id})`);
                          setSearchResults([]);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-muted text-sm border-b border-border/50 last:border-0"
                      >
                        <span className="font-medium">{m.name}</span> <span className="text-xs text-muted-foreground ml-2 font-mono">{m.employee_id}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Year *</label>
                  <input type="number" required value={createForm.year} onChange={e => setCreateForm(f => ({ ...f, year: parseInt(e.target.value) }))} className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Amount (₹) *</label>
                  <input type="number" required min="1" value={createForm.amount} onChange={e => setCreateForm(f => ({ ...f, amount: parseInt(e.target.value) }))} className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:border-primary" />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Title *</label>
                <input type="text" required value={createForm.title} onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Annual Donation" className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:border-primary" />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Due Date *</label>
                <input type="date" required value={createForm.due_date} onChange={e => setCreateForm(f => ({ ...f, due_date: e.target.value }))} className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:border-primary" />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Description (Optional)</label>
                <textarea value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:border-primary resize-none h-16" />
              </div>

              <div className="flex gap-3 pt-2 border-t border-border">
                <button type="button" onClick={() => setCreateModal(false)} className="flex-1 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted">Cancel</button>
                <button type="submit" disabled={creating || !createForm.member_id} className="flex-[2] py-2 gradient-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center">
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
