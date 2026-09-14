'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { db } from '@/lib/firebase/client';
import { collection, getDocs, doc, query, orderBy, where, getDoc } from 'firebase/firestore';
import { useAuth } from '@/lib/auth-context';
import type { Donation, Member, Role } from '@/types';
import { reportPayment, confirmPayment, rejectPayment, createDonationRequest } from '@/app/actions/donations';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import { CAN_MANAGE_DONATIONS, DONATION_STATUS } from '@/lib/constants';
import { StatusBadge } from '@/components/status-badge';
import { IndianRupee, CheckCircle2, TrendingUp, FileText, Plus, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { TableSkeleton, ListSkeleton, CardSkeleton } from '@/components/ui/skeletons';
import { Modal } from '@/components/ui/modal';

export default function DonationsPage() {
  const { member, role } = useAuth();
  const canManage = role && CAN_MANAGE_DONATIONS.includes(role as Role);

  const [activeTab, setActiveTab] = useState<'my' | 'verification' | 'history'>('my');

  // Member Data
  const [myDonations, setMyDonations] = useState<Donation[]>([]);
  const [myLoading, setMyLoading] = useState(true);
  const [myError, setMyError] = useState<string | null>(null);

  // Verification Data
  const [reportedPayments, setReportedPayments] = useState<(Donation & { member?: Member })[]>([]);
  const [verificationLoading, setVerificationLoading] = useState(true);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  
  // History Data
  const [allDonations, setAllDonations] = useState<(Donation & { member?: Member; verifier?: Member })[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  
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

  const loadMyDonations = useCallback(async () => {
    if (!member) return;
    setMyLoading(true);
    setMyError(null);
    try {
      const snap = await getDocs(query(collection(db, 'donations'), where('member_id', '==', member.id), orderBy('created_at', 'desc')));
      setMyDonations(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Donation[]);
    } catch (error: any) {
      console.error('Firebase Query Error:', {
        code: error.code,
        message: error.message,
        details: error
      });
      setMyError('Unable to load your donations.');
    }
    setMyLoading(false);
  }, [member]);

  const loadVerifications = useCallback(async () => {
    if (!canManage) return;
    setVerificationLoading(true);
    setVerificationError(null);
    try {
      const snap = await getDocs(query(collection(db, 'donations'), where('status', '==', DONATION_STATUS.PAYMENT_REPORTED), orderBy('reported_at', 'desc')));
      const verifications = await Promise.all(snap.docs.map(async docSnap => {
        const d = { id: docSnap.id, ...docSnap.data() } as any;
        if (d.member_id) {
          const mSnap = await getDoc(doc(db, 'members', d.member_id));
          if (mSnap.exists()) d.member = mSnap.data();
        }
        return d;
      }));
      setReportedPayments(verifications);
    } catch (error: any) {
      console.error('Firebase Query Error:', {
        code: error.code,
        message: error.message,
        details: error
      });
      setVerificationError('Unable to load verifications.');
    }
    setVerificationLoading(false);
  }, [canManage]);

  const loadHistory = useCallback(async () => {
    if (!canManage) return;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const snap = await getDocs(query(collection(db, 'donations'), orderBy('created_at', 'desc')));
      const history = await Promise.all(snap.docs.map(async docSnap => {
        const d = { id: docSnap.id, ...docSnap.data() } as any;
        if (d.member_id) {
          const mSnap = await getDoc(doc(db, 'members', d.member_id));
          if (mSnap.exists()) d.member = mSnap.data();
        }
        if (d.verified_by) {
          const vSnap = await getDoc(doc(db, 'members', d.verified_by));
          if (vSnap.exists()) d.verifier = vSnap.data();
        }
        return d;
      }));
      setAllDonations(history);
    } catch (error: any) {
      console.error('Firebase Query Error:', {
        code: error.code,
        message: error.message,
        details: error
      });
      setHistoryError('Unable to load donations.');
    }
    setHistoryLoading(false);
  }, [canManage]);

  useEffect(() => {
    if (member) {
      if (activeTab === 'my') loadMyDonations();
      if (activeTab === 'verification' && canManage) loadVerifications();
      if (activeTab === 'history' && canManage) loadHistory();
    }
  }, [member, activeTab, loadMyDonations, loadVerifications, loadHistory, canManage]);

  // --- Member Actions ---
  async function submitReportPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!reportModal) return;
    setReporting(true);

    const result = await reportPayment(reportModal.id, {
      date: reportForm.date,
      method: reportForm.method,
      reference: reportForm.reference,
      proof: reportForm.proof,
      notes: reportForm.notes,
      existingDescription: reportModal.description || '',
      title: reportModal.title || '',
      year: reportModal.year
    });

    if (result.error) {
      toast.error(`Failed to report payment: ${result.error}`);
    } else {
      toast.success('Payment reported successfully');
      setReportModal(null);
      loadMyDonations();
    }
    setReporting(false);
  }

  // --- Officer Actions ---
  async function handleConfirmPayment(donationId: string) {
    if (!verifyModal) return;
    setVerifying(true);
    
    const result = await confirmPayment(donationId);

    if (result.error) {
      toast.error(`Failed to confirm payment: ${result.error}`);
    } else {
      toast.success('Payment confirmed and receipt generated.');
      setVerifyModal(null);
      loadVerifications();
    }
    setVerifying(false);
  }

  async function handleRejectPayment(donationId: string) {
    if (!verifyModal || !rejectReason.trim()) {
      toast.error('Rejection reason is required.');
      return;
    }
    setVerifying(true);
    
    const result = await rejectPayment(donationId, rejectReason);

    if (result.error) {
      toast.error(`Failed to reject payment: ${result.error}`);
    } else {
      toast.success('Payment rejected.');
      setVerifyModal(null);
      setShowRejectInput(false);
      setRejectReason('');
      loadVerifications();
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
      try {
        const snap = await getDocs(collection(db, 'members'));
        const lowerSearch = memberSearch.toLowerCase();
        const results = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Member)
           .filter(m => m.name.toLowerCase().includes(lowerSearch) || m.employee_id.toLowerCase().includes(lowerSearch))
           .slice(0, 10);
        setSearchResults(results);
      } catch(e) {}
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

    const result = await createDonationRequest({
      member_id: createForm.member_id,
      year: createForm.year,
      amount: createForm.amount,
      title: createForm.title,
      description: createForm.description,
      due_date: createForm.due_date
    });

    if (result.error) {
      toast.error(`Failed to create donation request: ${result.error}`);
    } else {
      toast.success('Donation request created.');
      setCreateModal(false);
      loadHistory();
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
        <button onClick={() => { setActiveTab('my'); setYearFilter(''); }} className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all', activeTab === 'my' ? 'bg-card text-foreground shadow-sm border border-border/50' : 'text-muted-foreground hover:text-foreground')}>
          <FileText className="w-4 h-4" /> My Donations
        </button>
        {canManage && (
          <>
            <button onClick={() => { setActiveTab('verification'); setYearFilter(''); }} className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all', activeTab === 'verification' ? 'bg-card text-foreground shadow-sm border border-border/50' : 'text-muted-foreground hover:text-foreground')}>
              <CheckCircle2 className="w-4 h-4" /> Verifications {reportedPayments.length > 0 && <span className="ml-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border text-xs">{reportedPayments.length}</span>}
            </button>
            <button onClick={() => { setActiveTab('history'); setYearFilter(''); }} className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all', activeTab === 'history' ? 'bg-card text-foreground shadow-sm border border-border/50' : 'text-muted-foreground hover:text-foreground')}>
              <TrendingUp className="w-4 h-4" /> All Donations (Admin)
            </button>
          </>
        )}
      </div>

      {/* --- MY DONATIONS TAB --- */}
      {activeTab === 'my' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-card rounded-xl border border-border p-5">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide mb-1">Total Entries</p>
              {myLoading ? <div className="h-7 w-12 bg-muted rounded animate-pulse" /> : <p className="text-xl font-bold text-foreground text-foreground">{myFiltered.length}</p>}
            </div>
            <div className="bg-card rounded-xl border border-border p-5">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide mb-1">Years Paid</p>
              {myLoading ? <div className="h-7 w-12 bg-muted rounded animate-pulse" /> : <p className="text-xl font-bold text-foreground text-foreground">{myTotalPaid}</p>}
            </div>
            <div className="bg-card rounded-xl border border-border p-5">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide mb-1">Pending</p>
              {myLoading ? <div className="h-7 w-12 bg-muted rounded animate-pulse" /> : <p className="text-xl font-bold text-foreground text-foreground">{myTotalPending}</p>}
            </div>
            <div className="bg-card rounded-xl border border-border p-5">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide mb-1">Total Paid</p>
              {myLoading ? <div className="h-7 w-20 bg-muted rounded animate-pulse" /> : <p className="text-xl font-bold text-foreground text-foreground">{formatCurrency(myTotalCollected)}</p>}
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
            {myError && !myLoading ? (
              <ErrorState message={myError} onRetry={loadMyDonations} />
            ) : myLoading ? (
              <TableSkeleton columns={5} rows={4} />
            ) : myFiltered.length === 0 ? (
              <EmptyState icon={FileText} title="No records found" description="You do not have any donations in this period." className="py-12" />
            ) : (
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
                    {myFiltered.map(d => (
                      <tr key={d.id} className="hover:bg-muted/20 transition-colors">
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
                          {d.status === DONATION_STATUS.PAYMENT_REPORTED && d.payment_date && <div className="text-xs text-muted-foreground">Reported: {formatDate(d.payment_date)}</div>}
                          {(d.status === DONATION_STATUS.PENDING || d.status === DONATION_STATUS.OVERDUE) && d.due_date && <div className="text-xs text-muted-foreground">Due: {formatDate(d.due_date)}</div>}
                        </td>
                        <td className="px-5 py-4 text-right">
                          {(d.status === DONATION_STATUS.PENDING || d.status === DONATION_STATUS.OVERDUE || d.status === DONATION_STATUS.REJECTED) && (
                            <button onClick={() => setReportModal(d)} className="px-3 py-1.5 bg-muted text-foreground border border-border hover:bg-muted/80 rounded-lg text-xs font-medium transition-colors">
                              Report Payment
                            </button>
                          )}
                          {d.status === DONATION_STATUS.PAID && (
                            <button onClick={() => handleDownloadReceipt(d)} className="px-3 py-1.5 bg-foreground text-background hover:opacity-90 rounded-lg text-xs font-medium transition-colors">
                              Receipt
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- VERIFICATIONS TAB --- */}
      {activeTab === 'verification' && canManage && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Payments Awaiting Verification</h3>
              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-md border border-border font-medium">{reportedPayments.length} reported</span>
            </div>
            {verificationError && !verificationLoading ? (
              <ErrorState message={verificationError} onRetry={loadVerifications} />
            ) : verificationLoading ? (
              <TableSkeleton columns={4} rows={4} />
            ) : reportedPayments.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="No pending verifications" description="All reported payments have been verified." className="py-12" />
            ) : (
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
                    {reportedPayments.map(d => (
                      <tr key={d.id} className="hover:bg-muted/20 transition-colors">
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
            )}
          </div>
        </div>
      )}

      {/* --- HISTORY TAB (ADMIN) --- */}
      {activeTab === 'history' && canManage && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <div className="flex gap-2 bg-muted p-1 rounded-xl overflow-x-auto scrollbar-hide border border-border/50">
              {['ALL', DONATION_STATUS.PENDING, DONATION_STATUS.PAYMENT_REPORTED, DONATION_STATUS.PAID, DONATION_STATUS.REJECTED, DONATION_STATUS.OVERDUE].map(s => (
                <button key={s} onClick={() => setHistoryTab(s as any)} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors', historyTab === s ? 'bg-card text-foreground shadow-sm border border-border/50' : 'text-muted-foreground hover:text-foreground')}>
                  {s === DONATION_STATUS.PAYMENT_REPORTED ? 'REPORTED' : s === 'ALL' ? 'ALL' : s.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee..." className="pl-9 pr-3 py-1.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <button onClick={() => setCreateModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 btn-primary text-xs">
                <Plus className="w-4 h-4" /> Create Request
              </button>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            {historyError && !historyLoading ? (
              <ErrorState message={historyError} onRetry={loadHistory} />
            ) : historyLoading ? (
              <TableSkeleton columns={5} rows={8} />
            ) : historyFiltered.length === 0 ? (
              <EmptyState icon={TrendingUp} title="No records found" description="No donations match your filters." className="py-12" />
            ) : (
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
                    {historyFiltered.map(d => (
                      <tr key={d.id} className="hover:bg-muted/20 transition-colors">
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
                          {d.status === DONATION_STATUS.PAYMENT_REPORTED && d.payment_date && <p className="text-muted-foreground">Reported: {formatDate(d.payment_date)}</p>}
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
            )}
          </div>
        </div>
      )}

      {/* MODALS */}
      
      {/* Report Payment Modal */}
      {/* Report Payment Modal */}
      <Modal
        isOpen={!!reportModal}
        onClose={() => setReportModal(null)}
        title="Report Payment"
        maxWidth="max-w-md"
        footer={
          <>
            <button type="button" onClick={() => setReportModal(null)} className="w-full sm:w-auto px-6 h-12 border border-border rounded-xl text-sm font-medium hover:bg-muted text-muted-foreground transition-colors">Cancel</button>
            <button type="submit" form="report-payment-form" disabled={reporting} className="w-full sm:w-auto px-6 h-12 bg-foreground text-background hover:bg-foreground/90 rounded-xl text-sm font-medium disabled:opacity-70 flex items-center justify-center min-w-[160px]">
              {reporting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Report'}
            </button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground mb-6">{reportModal?.title || `Annual Donation ${reportModal?.year}`} • {reportModal && formatCurrency(reportModal.amount)}</p>
        <form id="report-payment-form" onSubmit={submitReportPayment} className="space-y-6">
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Payment Date *</label>
            <input type="date" required value={reportForm.date} onChange={e => setReportForm(f => ({ ...f, date: e.target.value }))} className="w-full px-4 h-12 bg-muted/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-foreground/50 transition-all" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Payment Method *</label>
            <select required value={reportForm.method} onChange={e => setReportForm(f => ({ ...f, method: e.target.value }))} className="w-full px-4 h-12 bg-muted/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-foreground/50 transition-all">
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="UPI">UPI / GPay / PhonePe</option>
              <option value="Cash">Cash</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Transaction / Reference Number</label>
            <input type="text" value={reportForm.reference} onChange={e => setReportForm(f => ({ ...f, reference: e.target.value }))} placeholder="e.g. UTR Number" className="w-full px-4 h-12 bg-muted/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50 transition-all" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Notes (Optional)</label>
            <textarea value={reportForm.notes} onChange={e => setReportForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any additional information..." className="w-full px-4 py-3 min-h-[120px] bg-muted/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50 transition-all resize-none" />
          </div>
        </form>
      </Modal>

      {/* Verify Modal */}
      <Modal
        isOpen={!!verifyModal}
        onClose={() => { setVerifyModal(null); setShowRejectInput(false); }}
        title="Verify Payment"
        maxWidth="max-w-md"
        footer={
          showRejectInput ? null : (
            <>
              <button onClick={() => setShowRejectInput(true)} className="w-full sm:w-auto px-6 h-12 border border-border text-muted-foreground bg-muted hover:bg-muted/80 rounded-xl text-sm font-medium transition-colors">
                Reject
              </button>
              <button onClick={() => { if(confirm('Confirm this payment as received?')) handleConfirmPayment(verifyModal!.id); }} disabled={verifying} className="w-full sm:w-auto px-6 h-12 bg-foreground text-background hover:bg-foreground/90 rounded-xl text-sm font-medium flex items-center justify-center min-w-[160px]">
                {verifying ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Payment'}
              </button>
            </>
          )
        }
      >
        {verifyModal && (
          <>
            <div className="bg-muted/50 rounded-xl p-5 space-y-3 mb-6 border border-border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Member</span>
                <span className="font-semibold text-right text-foreground">{(verifyModal as any).member?.name}<br/><span className="text-xs text-muted-foreground font-mono">{(verifyModal as any).member?.employee_id}</span></span>
              </div>
              <div className="flex justify-between text-sm border-t border-border pt-3">
                <span className="text-muted-foreground">Donation</span>
                <span className="font-semibold text-foreground">{verifyModal.title || verifyModal.year}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-border pt-3">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold text-foreground">{formatCurrency(verifyModal.amount)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-border pt-3">
                <span className="text-muted-foreground">Method / Ref</span>
                <span className="font-medium text-right text-foreground">{verifyModal.payment_method || '—'}<br/><span className="text-xs text-muted-foreground">{verifyModal.transaction_reference || 'No Ref'}</span></span>
              </div>
              <div className="flex justify-between text-sm border-t border-border pt-3">
                <span className="text-muted-foreground">Payment Date</span>
                <span className="font-medium text-foreground">{verifyModal.payment_date ? formatDate(verifyModal.payment_date) : '—'}</span>
              </div>
            </div>

            {showRejectInput && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">Reason for Rejection *</label>
                  <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="e.g. Payment reference could not be verified." className="w-full px-4 py-3 min-h-[120px] bg-muted/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50 transition-all resize-none" />
                </div>
                <div className="flex flex-col-reverse sm:flex-row gap-3">
                  <button onClick={() => setShowRejectInput(false)} className="w-full sm:w-auto px-6 h-12 border border-border rounded-xl text-sm font-medium hover:bg-muted text-muted-foreground transition-colors">Cancel</button>
                  <button onClick={() => handleRejectPayment(verifyModal.id)} disabled={verifying || !rejectReason.trim()} className="w-full sm:w-auto px-6 h-12 bg-foreground text-background rounded-xl text-sm font-medium hover:opacity-85 disabled:opacity-50 transition-colors flex items-center justify-center flex-1">
                    {verifying ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Confirm Rejection'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Modal>

      {/* Create Donation Request Modal */}
      <Modal
        isOpen={createModal}
        onClose={() => setCreateModal(false)}
        title="Create Donation Request"
        maxWidth="max-w-lg"
        footer={
          <>
            <button type="button" onClick={() => setCreateModal(false)} className="w-full sm:w-auto px-6 h-12 border border-border rounded-xl text-sm font-medium hover:bg-muted text-muted-foreground transition-colors">Cancel</button>
            <button type="submit" form="create-donation-form" disabled={creating || !createForm.member_id} className="w-full sm:w-auto px-6 h-12 bg-foreground text-background hover:bg-foreground/90 rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center min-w-[160px]">
              {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Request'}
            </button>
          </>
        }
      >
        <form id="create-donation-form" onSubmit={handleCreateDonation} className="space-y-6">
          <div className="relative">
            <label className="text-sm font-medium text-foreground block mb-2">Search Member *</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input 
                type="text" 
                value={memberSearch}
                onChange={e => {
                  setMemberSearch(e.target.value);
                  if(createForm.member_id) setCreateForm(f => ({ ...f, member_id: '' })); // clear selection if typing
                }}
                placeholder="Search by name or Employee ID (e.g. 1234455)" 
                className={cn("w-full pl-11 pr-4 h-12 bg-muted/50 border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50 transition-all", createForm.member_id ? 'border-foreground bg-muted' : 'border-border')} 
              />
              {searching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground animate-spin" />}
            </div>
            
            {searchResults.length > 0 && !createForm.member_id && (
              <div className="absolute w-full mt-2 bg-card border border-border rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto">
                {searchResults.map(m => (
                  <button 
                    key={m.id} 
                    type="button"
                    onClick={() => {
                      setCreateForm(f => ({ ...f, member_id: m.id || '' }));
                      setMemberSearch(`${m.name} (${m.employee_id})`);
                      setSearchResults([]);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-muted text-sm border-b border-border/50 last:border-0 text-foreground transition-colors"
                  >
                    <span className="font-medium">{m.name}</span> <span className="text-xs text-muted-foreground ml-2 font-mono">{m.employee_id}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">Year *</label>
              <input type="number" required value={createForm.year} onChange={e => setCreateForm(f => ({ ...f, year: parseInt(e.target.value) }))} className="w-full px-4 h-12 bg-muted/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-foreground/50 transition-all" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">Amount (₹) *</label>
              <input type="number" required min="1" value={createForm.amount} onChange={e => setCreateForm(f => ({ ...f, amount: parseInt(e.target.value) }))} className="w-full px-4 h-12 bg-muted/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-foreground/50 transition-all" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Title *</label>
            <input type="text" required value={createForm.title} onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Annual Donation" className="w-full px-4 h-12 bg-muted/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50 transition-all" />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Due Date *</label>
            <input type="date" required value={createForm.due_date} onChange={e => setCreateForm(f => ({ ...f, due_date: e.target.value }))} className="w-full px-4 h-12 bg-muted/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-foreground/50 transition-all" />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Description (Optional)</label>
            <textarea value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} className="w-full px-4 py-3 min-h-[120px] bg-muted/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-foreground/50 transition-all resize-none" />
          </div>
        </form>
      </Modal>
    </div>
  );
}
