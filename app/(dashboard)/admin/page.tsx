'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import type { Member, Donation, Event, ActivityLog, Role } from '@/types';
import { DONATION_STATUS } from '@/lib/constants';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import { ROLE_COLORS } from '@/lib/constants';
import {
  Shield, Users, IndianRupee, CalendarDays, BarChart3, Activity,
  Plus, Edit2, Trash2, Save, X, Loader2, Search, Download,
  CheckCircle2, Clock, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

const TABS = [
  { key: 'dashboard', label: 'Analytics', icon: BarChart3 },
  { key: 'members', label: 'Members', icon: Users },
  { key: 'donations', label: 'Donations', icon: IndianRupee },
  { key: 'logs', label: 'Activity Logs', icon: Activity },
];

const ROLES_LIST: Role[] = ['President', 'Secretary', 'Treasurer', 'Member', 'Admin'];
const CHART_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

type MemberForm = {
  employee_id: string; name: string; phone: string; email: string;
  role: Role; division: string; sub_division: string;
  joining_date: string; status: string; password: string;
};

const EMPTY_FORM: MemberForm = {
  employee_id: '', name: '', phone: '', email: '',
  role: 'Member', division: '', sub_division: '',
  joining_date: new Date().toISOString().split('T')[0], status: 'Active', password: 'tpas@2025',
};

export default function AdminPage() {
  const { member, role } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  // Redirect non-admins
  useEffect(() => {
    if (role && role !== 'Admin') { toast.error('Access denied.'); router.replace('/dashboard'); }
  }, [role]);

  const [tab, setTab] = useState('dashboard');
  const [members, setMembers] = useState<Member[]>([]);
  const [donations, setDonations] = useState<(Donation & { member?: Member })[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, paid: 0, pending: 0, events: 0 });
  const [chartData, setChartData] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
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
    supabase.from('divisions').select('id, name').then(({ data }) => setDivisions(data || []));
    supabase.from('sub_divisions').select('id, name, division_id').then(({ data }) => setSubDivisions(data || []));
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [membersRes, donationsRes, logsRes, eventsRes] = await Promise.all([
      supabase.from('members').select('*').order('name'),
      supabase.from('donations').select('*, member:members!member_id(name, employee_id)').order('created_at', { ascending: false }).limit(50),
      supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('events').select('id'),
    ]);

    const allMembers = (membersRes.data as Member[]) ?? [];
    setMembers(allMembers);
    setDonations(donationsRes.data as any ?? []);
    setLogs(logsRes.data as ActivityLog[] ?? []);

    const activeCount = allMembers.filter(m => m.status === 'Active').length;
    const currentYear = new Date().getFullYear();
    const allDonations = donationsRes.data ?? [];
    const paidCount = allDonations.filter((d: any) => d.year === currentYear && d.status === DONATION_STATUS.PAID).length;
    const pendingCount = allDonations.filter((d: any) => d.year === currentYear && d.status === DONATION_STATUS.PENDING).length;

    setStats({
      total: allMembers.length,
      active: activeCount,
      paid: paidCount,
      pending: pendingCount,
      events: eventsRes.data?.length ?? 0,
    });

    // Role distribution chart
    const roleMap: Record<string, number> = {};
    for (const m of allMembers) {
      roleMap[m.role] = (roleMap[m.role] ?? 0) + 1;
    }
    setChartData(Object.entries(roleMap).map(([name, value]) => ({ name, value })));
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function openAdd() { setEditMember(null); setForm(EMPTY_FORM); setShowForm(true); }
  function openEdit(m: Member) {
    setEditMember(m);
    setForm({ ...EMPTY_FORM, employee_id: m.employee_id, name: m.name, phone: m.phone ?? '', email: m.email ?? '', role: m.role as Role, division: m.division ?? '', sub_division: m.sub_division ?? '', joining_date: m.joining_date ?? '', status: m.status, password: '' });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.employee_id || !form.name) { toast.error('Employee ID and Name are required.'); return; }
    setSubmitting(true);

    if (editMember) {
      const { error } = await supabase.from('members').update({
        employee_id: form.employee_id, name: form.name, phone: form.phone, email: form.email,
        role: form.role, division: form.division || null, sub_division: form.sub_division || null,
        joining_date: form.joining_date, status: form.status,
      }).eq('id', editMember.id);
      if (error) { toast.error('Failed to update member.'); }
      else { toast.success('Member updated!'); setShowForm(false); loadData(); }
    } else {
      // Create member
      const { data: newMember, error: memberError } = await supabase.from('members').insert({
        employee_id: form.employee_id, name: form.name, phone: form.phone, email: form.email,
        role: form.role, division: form.division || null, sub_division: form.sub_division || null,
        joining_date: form.joining_date, status: form.status,
      }).select().single();

      if (memberError) { toast.error(memberError.message); setSubmitting(false); return; }

      // Create auth record
      await supabase.from('member_auth').insert({
        member_id: newMember.id,
        password_hash: form.password || 'tpas@2025',
      });

      // Create donation record for current year
      await supabase.from('donations').insert({
        member_id: newMember.id, year: new Date().getFullYear(), amount: 500, status: 'Pending',
      });

      await supabase.from('activity_logs').insert({
        member_id: member!.id, action: 'ADD_MEMBER', details: `Added new member: ${form.name} (${form.employee_id})`,
      });

      toast.success('Member added successfully!');
      setShowForm(false);
      loadData();
    }
    setSubmitting(false);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete member "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    const { error } = await supabase.from('members').delete().eq('id', id);
    if (error) { toast.error('Failed to delete member.'); }
    else {
      await supabase.from('activity_logs').insert({ member_id: member!.id, action: 'DELETE_MEMBER', details: `Deleted member: ${name}` });
      toast.success('Member deleted.');
      loadData();
    }
    setDeleting(null);
  }

  async function handleResetPassword(m: Member) {
    const newPassword = prompt(`Enter new password for ${m.name}:\n(Leave blank to use default 'tpas@2025')`, 'tpas@2025');
    if (newPassword === null) return; // Cancelled
    
    const finalPassword = newPassword.trim() || 'tpas@2025';

    setResetting(m.id);
    const { error } = await supabase.from('member_auth').update({ password_hash: finalPassword }).eq('member_id', m.id);
    if (error) { toast.error('Failed to reset password.'); }
    else {
      await supabase.from('activity_logs').insert({ member_id: member!.id, action: 'RESET_PASSWORD', details: `Reset password for: ${m.name}` });
      toast.success(`Password updated for ${m.name}!`);
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
    toast.success('Members exported as CSV!');
  }

  const filteredMembers = members.filter(m =>
    !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.employee_id.toLowerCase().includes(search.toLowerCase())
  );

  if (role !== 'Admin') return null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 gradient-primary rounded-xl shadow-md">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Admin Panel</h2>
          <p className="text-sm text-muted-foreground">Manage all organizational data</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit flex-wrap">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
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
            {[
              { label: 'Total Members', value: stats.total, color: 'from-blue-600 to-blue-700', icon: Users },
              { label: 'Active Members', value: stats.active, color: 'from-emerald-500 to-emerald-600', icon: CheckCircle2 },
              { label: 'Paid This Year', value: stats.paid, color: 'from-purple-600 to-purple-700', icon: IndianRupee },
              { label: 'Pending', value: stats.pending, color: 'from-amber-500 to-orange-500', icon: Clock },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className={`bg-gradient-to-br ${color} rounded-2xl p-5 text-white shadow-lg`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white/70 text-xs uppercase tracking-wide">{label}</p>
                  <Icon className="w-4 h-4 text-white/60" />
                </div>
                <p className="text-3xl font-bold">{loading ? '—' : value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Role Distribution */}
            <div className="bg-card rounded-2xl border border-border p-5">
              <h3 className="font-semibold text-foreground mb-4">Role Distribution</h3>
              {!loading && (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name} (${value})`} labelLine={false}>
                      {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend iconType="circle" iconSize={8} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Recent Activity */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="font-semibold text-foreground">Recent Activity</h3>
              </div>
              <div className="divide-y divide-border max-h-64 overflow-y-auto scrollbar-thin">
                {logs.slice(0, 10).map((log) => (
                  <div key={log.id} className="px-5 py-3 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Activity className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{log.details}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDate(log.created_at)}</p>
                    </div>
                  </div>
                ))}
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
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members..." className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="flex gap-2">
              <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-colors">
                <Download className="w-4 h-4" /> Export CSV
              </button>
              <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 gradient-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-md shadow-primary/20">
                <Plus className="w-4 h-4" /> Add Member
              </button>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="overflow-x-auto max-h-[600px] scrollbar-thin">
              <table className="w-full">
                <thead className="sticky top-0 bg-muted/95 backdrop-blur-md z-10 shadow-sm">
                  <tr className="border-b border-border">
                    {['Member', 'Role', 'Division', 'Status', 'Joined', 'Actions'].map(h => (
                      <th key={h} className={cn('text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3', h === 'Actions' ? 'text-right' : 'text-left')}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    Array(5).fill(0).map((_, i) => (
                      <tr key={i}>
                        {Array(6).fill(0).map((_, j) => (
                          <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>
                        ))}
                      </tr>
                    ))
                  ) : filteredMembers.map(m => (
                    <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{m.name}</p>
                          <p className="text-xs text-muted-foreground">{m.employee_id}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', ROLE_COLORS[m.role as Role])}>{m.role}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-32 truncate">{m.division ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs font-medium', m.status === 'Active' ? 'text-emerald-600' : 'text-amber-600')}>● {m.status}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(m.joining_date)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(m)} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950 text-blue-600 transition-colors" title="Edit">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleResetPassword(m)}
                            disabled={resetting === m.id}
                            className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950 text-amber-600 transition-colors" title="Reset Password"
                          >
                            {resetting === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => handleDelete(m.id, m.name)}
                            disabled={deleting === m.id || m.id === member?.id}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-red-600 transition-colors disabled:opacity-40" title="Delete"
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
          </div>
        </div>
      )}

      {/* Donations Tab */}
      {tab === 'donations' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">All Donations (Latest 50)</h3>
            </div>
            <div className="overflow-x-auto max-h-[600px] scrollbar-thin">
              <table className="w-full">
                <thead className="sticky top-0 bg-muted/95 backdrop-blur-md z-10 shadow-sm">
                  <tr className="border-b border-border">
                    {['Member', 'Year', 'Amount', 'Status', 'Payment Date', 'Receipt No.'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    Array(8).fill(0).map((_, i) => (
                      <tr key={i}>{Array(6).fill(0).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>)}</tr>
                    ))
                  ) : donations.map(d => (
                    <tr key={d.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-foreground">{(d as any).member?.name ?? '—'}</p>
                        <p className="text-xs text-muted-foreground">{(d as any).member?.employee_id}</p>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-foreground">{d.year}</td>
                      <td className="px-4 py-3 text-sm text-foreground">{formatCurrency(d.amount)}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', d.status === DONATION_STATUS.PAID ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400')}>
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
          </div>
        </div>
      )}

      {/* Activity Logs Tab */}
      {tab === 'logs' && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden animate-fade-in">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Activity Logs</h3>
            <span className="text-xs text-muted-foreground">{logs.length} entries</span>
          </div>
          <div className="divide-y divide-border max-h-[600px] overflow-y-auto scrollbar-thin">
            {logs.map((log) => (
              <div key={log.id} className="px-5 py-3.5 flex items-start gap-3 hover:bg-muted/20 transition-colors">
                <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold',
                  log.action.includes('DELETE') ? 'bg-red-100 text-red-600 dark:bg-red-950' :
                  log.action.includes('ADD') ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950' :
                  log.action === 'LOGIN' ? 'bg-blue-100 text-blue-600 dark:bg-blue-950' :
                  'bg-muted text-muted-foreground'
                )}>
                  <Activity className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{log.details}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded',
                      log.action.includes('DELETE') ? 'bg-red-100 text-red-600' :
                      log.action.includes('ADD') ? 'bg-emerald-100 text-emerald-600' :
                      'bg-muted text-muted-foreground'
                    )}>{log.action}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(log.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Member Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowForm(false)}>
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-2xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto scrollbar-thin" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground">{editMember ? 'Edit Member' : 'Add New Member'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Employee ID *', key: 'employee_id', type: 'text', placeholder: 'e.g. 1234455', disabled: !!editMember },
                { label: 'Full Name *', key: 'name', type: 'text', placeholder: 'Full name' },
                { label: 'Phone', key: 'phone', type: 'tel', placeholder: '9876543210' },
                { label: 'Email', key: 'email', type: 'email', placeholder: 'email@example.com' },
                { label: 'Joining Date', key: 'joining_date', type: 'date', placeholder: '' },
              ].map(({ label, key, type, placeholder, disabled }) => (
                <div key={key}>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">{label}</label>
                  <input
                    type={type}
                    value={form[key as keyof MemberForm]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    disabled={disabled}
                    className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
                  />
                </div>
              ))}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Role</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))} className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                  {ROLES_LIST.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Division</label>
                <select value={form.division} onChange={e => setForm(f => ({ ...f, division: e.target.value, sub_division: '' }))} className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="">Select Division</option>
                  {divisions.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Sub Division</label>
                <select value={form.sub_division} onChange={e => setForm(f => ({ ...f, sub_division: e.target.value }))} disabled={!form.division} className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50">
                  <option value="">Select Sub Division</option>
                  {subDivisions.filter(sd => sd.division_id === divisions.find(d => d.name === form.division)?.id).map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                  {['Active', 'Inactive', 'Pending'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {!editMember && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Initial Password</label>
                  <input type="text" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="tpas@2025" className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              )}
              <div className="sm:col-span-2 flex gap-3 pt-2 border-t border-border">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2.5 gradient-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-70">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" />{editMember ? 'Save Changes' : 'Add Member'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
