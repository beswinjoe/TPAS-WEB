'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createFirebaseUserAction, resetFirebaseUserPasswordAction } from '@/app/actions/admin';
import { db } from '@/lib/firebase/client';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, query, orderBy, limit, addDoc, getDoc, getCountFromServer } from 'firebase/firestore';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import type { Member, Donation, Event, ActivityLog, Role } from '@/types';
import { DONATION_STATUS } from '@/lib/constants';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import {
  Shield, Users, IndianRupee, CalendarDays, BarChart3, Activity,
  Plus, Edit2, Trash2, Save, X, Loader2, Search, Download,
  CheckCircle2, Clock, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { TableSkeleton, ListSkeleton, CardSkeleton } from '@/components/ui/skeletons';
import { Modal } from '@/components/ui/modal';
import dynamic from 'next/dynamic';

const PieChart = dynamic(() => import('recharts').then(mod => mod.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(mod => mod.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then(mod => mod.Cell), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });

const TABS = [
  { key: 'dashboard', label: 'Analytics', icon: BarChart3 },
  { key: 'members', label: 'Members', icon: Users },
  { key: 'donations', label: 'Donations', icon: IndianRupee },
  { key: 'logs', label: 'Activity Logs', icon: Activity },
];

const ROLES_LIST: Role[] = ['President', 'Secretary', 'Treasurer', 'Member', 'Admin'];
const CHART_COLORS = ['#171717', '#525252', '#737373', '#a3a3a3', '#d4d4d4'];

type MemberForm = {
  employee_id: string; name: string; phone: string; email: string;
  role: Role; division: string; sub_division: string;
  joining_date: string; status: string;
};

const EMPTY_FORM: MemberForm = {
  employee_id: '', name: '', phone: '', email: '',
  role: 'Member', division: '', sub_division: '',
  joining_date: new Date().toISOString().split('T')[0], status: 'Active',
};

// Stat card — monochrome
function StatCard({ label, value, icon: Icon, loading }: { label: string; value: number; icon: React.ElementType; loading?: boolean }) {
  if (loading) return <CardSkeleton />;
  return (
    <div className="rounded-xl p-5 bg-card border border-border card-hover">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold mt-1.5 text-foreground">{value}</p>
        </div>
        <div className="p-2 bg-muted rounded-lg">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { member, role } = useAuth();
  const router = useRouter();

  // Redirect non-admins
  useEffect(() => {
    if (role && role !== 'Admin') { toast.error('Access denied.'); router.replace('/dashboard'); }
  }, [role, router]);

  const [tab, setTab] = useState('dashboard');
  
  // Progressive loading states
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersError, setMembersError] = useState(false);

  const [donations, setDonations] = useState<(Donation & { member?: { name: string, employee_id: string } })[]>([]);
  const [donationsLoading, setDonationsLoading] = useState(true);

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  const [eventsCount, setEventsCount] = useState(0);

  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [form, setForm] = useState<MemberForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [resetting, setResetting] = useState<string | null>(null);
  
  // Dynamic Divisions
  const [divisions, setDivisions] = useState<{ id: string; name: string }[]>([]);
  const [subDivisions, setSubDivisions] = useState<{ id: string; name: string; division_id: string }[]>([]);

  useEffect(() => {
    if (role === 'Admin') {
      getDocs(collection(db, 'divisions')).then(snap => setDivisions(snap.docs.map(d => ({ id: d.id, ...d.data() })) as any));
      getDocs(collection(db, 'sub_divisions')).then(snap => setSubDivisions(snap.docs.map(d => ({ id: d.id, ...d.data() })) as any));
    }
  }, [role]);

  const loadMembers = useCallback(async () => {
    setMembersLoading(true);
    setMembersError(false);
    try {
      const snap = await getDocs(query(collection(db, 'members'), orderBy('name')));
      setMembers(snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })) as Member[]);
    } catch (error) {
      console.error(error);
      setMembersError(true);
    }
    setMembersLoading(false);
  }, []);

  const loadDonations = useCallback(async () => {
    setDonationsLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'donations'), orderBy('created_at', 'desc'), limit(50)));
      const donationsData = await Promise.all(snap.docs.map(async docSnap => {
        const d = { id: docSnap.id, ...docSnap.data() } as any;
        if (d.member_id) {
          const mSnap = await getDoc(doc(db, 'members', d.member_id));
          if (mSnap.exists()) {
            const m = mSnap.data() as Member;
            d.member = { name: m.name, employee_id: m.employee_id };
          }
        }
        return d;
      }));
      setDonations(donationsData);
    } catch (e) {
      console.error(e);
    }
    setDonationsLoading(false);
  }, []);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'activity_logs'), orderBy('created_at', 'desc'), limit(10)));
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })) as any);
    } catch (e) {
      console.error(e);
    }
    setLogsLoading(false);
  }, []);

  const loadEvents = useCallback(async () => {
    try {
      const snapshot = await getCountFromServer(collection(db, 'events'));
      setEventsCount(snapshot.data().count);
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Keep track of what we've loaded to avoid refetching
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Only load data when the tab is first visited
    if (tab === 'dashboard' && !loadedTabs.has('dashboard')) {
      loadMembers(); // We need members for analytics stats
      loadDonations(); // We need donations for analytics stats
      loadEvents();
      setLoadedTabs(prev => new Set(prev).add('dashboard'));
    }
    if (tab === 'members' && !loadedTabs.has('members')) {
      loadMembers();
      setLoadedTabs(prev => new Set(prev).add('members'));
    }
    if (tab === 'donations' && !loadedTabs.has('donations')) {
      loadDonations();
      setLoadedTabs(prev => new Set(prev).add('donations'));
    }
    if (tab === 'logs' && !loadedTabs.has('logs')) {
      loadLogs();
      setLoadedTabs(prev => new Set(prev).add('logs'));
    }
  }, [tab, loadedTabs, loadMembers, loadDonations, loadLogs, loadEvents]);

  // Derived stats
  const stats = useMemo(() => {
    const activeCount = members.filter(m => m.status === 'Active').length;
    const currentYear = new Date().getFullYear();
    const paidCount = donations.filter(d => d.year === currentYear && d.status === DONATION_STATUS.PAID).length;
    const pendingCount = donations.filter(d => d.year === currentYear && d.status === DONATION_STATUS.PENDING).length;

    return {
      total: members.length,
      active: activeCount,
      paid: paidCount,
      pending: pendingCount,
      events: eventsCount,
    };
  }, [members, donations, eventsCount]);

  const chartData = useMemo(() => {
    const roleMap: Record<string, number> = {};
    for (const m of members) {
      roleMap[m.role] = (roleMap[m.role] ?? 0) + 1;
    }
    return Object.entries(roleMap).map(([name, value]) => ({ name, value }));
  }, [members]);

  function openAdd() { setEditMember(null); setForm(EMPTY_FORM); setShowForm(true); }
  function openEdit(m: Member) {
    setEditMember(m);
    setForm({ ...EMPTY_FORM, employee_id: m.employee_id, name: m.name, phone: m.phone ?? '', email: m.email ?? '', role: m.role as Role, division: m.division ?? '', sub_division: m.sub_division ?? '', joining_date: m.joining_date ?? '', status: m.status });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.employee_id || !form.name) { toast.error('Employee ID and Name are required.'); return; }
    
    const email = form.email ? form.email.trim().toLowerCase() : '';
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      toast.error('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);

    if (editMember) {
      try {
        await updateDoc(doc(db, 'members', editMember.id), {
          employee_id: form.employee_id, name: form.name, phone: form.phone, email: email,
          role: form.role, division: form.division || null, sub_division: form.sub_division || null,
          joining_date: form.joining_date, status: form.status,
        });
        toast.success('Member updated.');
        setShowForm(false);
        loadMembers();
      } catch (error: any) {
        toast.error(error.message || 'Failed to update member.');
        console.error(error);
      }
    } else {
      const result = await createFirebaseUserAction({
        ...form,
        email: email,
        adminUid: member!.id
      });

      if (result.success) {
        toast.success(`Member added successfully. Temporary Password: ${result.temporaryPassword}`, { duration: 10000 });
        setShowForm(false);
        loadMembers();
      } else {
        toast.error(result.error || 'Failed to add member.');
      }
    }
    setSubmitting(false);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete member "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await deleteDoc(doc(db, 'members', id));
      await addDoc(collection(db, 'activity_logs'), { member_id: member!.id, action: 'DELETE_MEMBER', details: `Deleted member: ${name}`, created_at: new Date().toISOString() });
      toast.success('Member deleted.');
      loadMembers();
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete member.');
    }
    setDeleting(null);
  }

  async function handleResetPassword(m: Member) {
    const newPassword = prompt(`Enter new password for ${m.name}:\n(Leave blank to use default 'tpas@2025')`, 'tpas@2025');
    if (newPassword === null) return;
    
    const finalPassword = newPassword.trim() || 'tpas@2025';

    setResetting(m.id);
    const result = await resetFirebaseUserPasswordAction(m.id, finalPassword, member!.id, m.name);
    
    if (!result.success) { 
      toast.error(result.error || 'Failed to reset password.'); 
    } else {
      toast.success(`Password updated for ${m.name}.`);
    }
    setResetting(null);
  }

  function exportCSV() {
    const headers = ['Employee ID', 'Name', 'Role', 'Division', 'Sub Division', 'Phone', 'Email', 'Status', 'Joining Date'];
    const rows = members.map(m => [
      m.employee_id, m.name, m.role, m.division ?? '', m.sub_division ?? '',
      m.phone ?? '', m.email ?? '', m.status, m.joining_date ?? ''
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `TPAS-Members-${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Members exported as CSV.');
  }

  const filteredMembers = members.filter(m =>
    !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.employee_id.toLowerCase().includes(search.toLowerCase())
  );

  if (role !== 'Admin') return null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-foreground rounded-xl">
          <Shield className="w-5 h-5 text-background" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Admin Panel</h2>
          <p className="text-sm text-muted-foreground">Manage all organizational data</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit flex-wrap border border-border/50">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === key ? 'bg-card text-foreground shadow-sm border border-border/50' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Analytics Tab */}
      {tab === 'dashboard' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Members" value={stats.total} icon={Users} loading={membersLoading} />
            <StatCard label="Active Members" value={stats.active} icon={CheckCircle2} loading={membersLoading} />
            <StatCard label="Paid This Year" value={stats.paid} icon={IndianRupee} loading={donationsLoading} />
            <StatCard label="Pending" value={stats.pending} icon={Clock} loading={donationsLoading} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Role Distribution */}
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="font-semibold text-foreground text-sm mb-4">Role Distribution</h3>
              {membersLoading ? (
                <div className="h-[220px] flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full border-2 border-border border-t-foreground animate-spin" />
                </div>
              ) : chartData.length === 0 ? (
                <EmptyState icon={Users} title="No member data yet" description="Role distribution will appear once members are added." />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={2}
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={{ stroke: 'currentColor', strokeWidth: 1, opacity: 0.2 }}
                    >
                      {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))', borderRadius: '8px', fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Recent Activity */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="font-semibold text-foreground text-sm">Recent Activity</h3>
              </div>
              <div className="divide-y divide-border max-h-64 overflow-y-auto scrollbar-thin">
                {logsLoading ? (
                  <ListSkeleton items={4} />
                ) : logs.length === 0 ? (
                  <EmptyState icon={Activity} title="No recent activity" description="Activities will appear here when members and administrators interact with the portal." className="py-6" />
                ) : (
                  logs.slice(0, 10).map((log) => (
                    <div key={log.id} className="px-5 py-3 flex items-start gap-3 hover:bg-muted/30 transition-colors">
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{log.details}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatDate(log.created_at)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Members Tab */}
      {tab === 'members' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members..." className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10 transition-all" />
            </div>
            <div className="flex gap-2">
              <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors">
                <Download className="w-4 h-4" /> Export CSV
              </button>
              <button onClick={openAdd} className="btn-primary">
                <Plus className="w-4 h-4" /> Add Member
              </button>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {membersError ? (
              <ErrorState message="Unable to load members." onRetry={loadMembers} className="py-12" />
            ) : membersLoading ? (
              <TableSkeleton rows={5} columns={6} />
            ) : (
              <div className="overflow-x-auto max-h-[600px] scrollbar-thin">
                <table className="w-full">
                  <thead className="sticky top-0 bg-muted z-10">
                    <tr className="border-b border-border">
                      {['Member', 'Role', 'Division', 'Status', 'Joined', 'Actions'].map(h => (
                        <th key={h} className={cn('text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3', h === 'Actions' ? 'text-right' : 'text-left')}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredMembers.length === 0 ? (
                      <tr>
                        <td colSpan={6}>
                          <EmptyState icon={Users} title={search ? 'No members found' : 'No members yet'} description={search ? 'Try adjusting your search.' : 'Members will appear here once they are added.'} className="py-12" />
                        </td>
                      </tr>
                    ) : filteredMembers.map(m => (
                      <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{m.name}</p>
                            <p className="text-xs text-muted-foreground">{m.employee_id}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">{m.role}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground max-w-32 truncate">{m.division ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium text-foreground">● {m.status}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(m.joining_date)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openEdit(m)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Edit">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleResetPassword(m)}
                              disabled={resetting === m.id}
                              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Reset Password"
                            >
                              {resetting === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => handleDelete(m.id, m.name)}
                              disabled={deleting === m.id || m.id === member?.id}
                              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40" title="Delete"
                            >
                              {deleting === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                          </div>
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

      {/* Donations Tab */}
      {tab === 'donations' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground text-sm">All Donations (Latest 50)</h3>
            </div>
            {donationsLoading ? (
              <TableSkeleton rows={5} columns={6} />
            ) : (
              <div className="overflow-x-auto max-h-[600px] scrollbar-thin">
                <table className="w-full">
                  <thead className="sticky top-0 bg-muted z-10">
                    <tr className="border-b border-border">
                      {['Member', 'Year', 'Amount', 'Status', 'Payment Date', 'Receipt No.'].map(h => (
                        <th key={h} className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {donations.length === 0 ? (
                      <tr>
                        <td colSpan={6}>
                          <EmptyState icon={IndianRupee} title="No donations yet" description="Donation records will appear here." className="py-12" />
                        </td>
                      </tr>
                    ) : donations.map(d => (
                      <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-foreground">{d.member?.name ?? '—'}</p>
                          <p className="text-xs text-muted-foreground">{d.member?.employee_id}</p>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-foreground">{d.year}</td>
                        <td className="px-4 py-3 text-sm text-foreground">{formatCurrency(d.amount)}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                            {d.status === DONATION_STATUS.PAID ? 'Paid' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{d.payment_date ? formatDate(d.payment_date) : '—'}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{d.receipt_number ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Activity Logs Tab */}
      {tab === 'logs' && (
        <div className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-foreground text-sm">Activity Logs</h3>
            <span className="text-xs text-muted-foreground">{logs.length} entries</span>
          </div>
          <div className="divide-y divide-border max-h-[600px] overflow-y-auto scrollbar-thin">
            {logsLoading ? (
              <ListSkeleton items={6} />
            ) : logs.length === 0 ? (
              <EmptyState icon={Activity} title="No activity logs" description="Activity logs will appear here when members interact with the portal." className="py-12" />
            ) : (
              logs.map((log) => (
                <div key={log.id} className="px-5 py-3.5 flex items-start gap-3 hover:bg-muted/30 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{log.details}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">{log.action}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(log.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Add/Edit Member Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editMember ? 'Edit Member' : 'Add New Member'}
        maxWidth="max-w-4xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="w-full sm:w-auto px-6 h-12 rounded-xl text-sm font-medium text-foreground hover:bg-muted border border-border transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="admin-member-form"
              disabled={submitting}
              className="w-full sm:w-auto px-6 h-12 rounded-xl text-sm font-medium bg-foreground text-background hover:bg-foreground/90 transition-colors disabled:opacity-70 flex items-center justify-center min-w-[160px]"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4 mr-2" />{editMember ? 'Save Changes' : 'Add Member'}</>}
            </button>
          </>
        }
      >
        <form id="admin-member-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          {/* LEFT COLUMN */}
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">Full Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Full name"
                className="w-full px-4 h-12 bg-muted/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground transition-all"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="email@example.com"
                className="w-full px-4 h-12 bg-muted/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground transition-all"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="9876543210"
                className="w-full px-4 h-12 bg-muted/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground transition-all"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">Joining Date</label>
              <input
                type="date"
                value={form.joining_date}
                onChange={e => setForm(f => ({ ...f, joining_date: e.target.value }))}
                className="w-full px-4 h-12 bg-muted/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground transition-all"
              />
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">Employee ID *</label>
              <input
                type="text"
                value={form.employee_id}
                onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}
                placeholder="e.g. 1234455"
                disabled={!!editMember}
                className="w-full px-4 h-12 bg-muted/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground disabled:opacity-60 transition-all"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">Division</label>
              <select
                value={form.division}
                onChange={e => setForm(f => ({ ...f, division: e.target.value, sub_division: '' }))}
                className="w-full px-4 h-12 bg-muted/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground transition-all"
              >
                <option value="">Select Division</option>
                {divisions.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">Sub Division</label>
              <select
                value={form.sub_division}
                onChange={e => setForm(f => ({ ...f, sub_division: e.target.value }))}
                disabled={!form.division}
                className="w-full px-4 h-12 bg-muted/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground disabled:opacity-50 transition-all"
              >
                <option value="">Select Sub Division</option>
                {subDivisions.filter(sd => sd.division_id === divisions.find(d => d.name === form.division)?.id).map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">Role</label>
              <select
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}
                className="w-full px-4 h-12 bg-muted/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground transition-all"
              >
                {ROLES_LIST.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full px-4 h-12 bg-muted/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground transition-all"
              >
                {['Active', 'Inactive', 'Pending'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
