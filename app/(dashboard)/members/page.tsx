'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import type { Member, Donation, Promotion, Role } from '@/types';
import { DONATION_STATUS, ROLE_COLORS, CAN_EDIT_MEMBERS } from '@/lib/constants';
import { formatDate, formatCurrency, getInitials, cn } from '@/lib/utils';
import {
  Search, Filter, X, Edit2, Trash2, Phone, Mail,
  ChevronLeft, ChevronRight, UserCircle, Loader2, Plus,
  Download, Printer, ArrowUpDown, FileSpreadsheet, IndianRupee,
  TrendingUp, CalendarDays, CreditCard, CheckCircle2, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

const ROLES: Role[] = ['President', 'Secretary', 'Treasurer', 'Member', 'Admin'];
const STATUS_OPTIONS = ['Active', 'Inactive', 'Pending'];
const PAGE_SIZE = 12;

const SORT_OPTIONS = [
  { label: 'Name A–Z', value: 'name-asc' },
  { label: 'Name Z–A', value: 'name-desc' },
  { label: 'Newest First', value: 'joining-desc' },
  { label: 'Oldest First', value: 'joining-asc' },
  { label: 'Employee ID', value: 'eid-asc' },
];

export default function MembersPage() {
  const { member: me, role } = useAuth();
  const supabase = createClient();
  const canEdit = role && CAN_EDIT_MEMBERS.includes(role as Role);

  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterDivision, setFilterDivision] = useState('');
  const [filterSubDivision, setFilterSubDivision] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDonation, setFilterDonation] = useState('');
  const [sortBy, setSortBy] = useState('name-asc');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [donationStatusMap, setDonationStatusMap] = useState<Record<string, string>>({});

  // For enhanced modal
  const [memberDonations, setMemberDonations] = useState<Donation[]>([]);
  const [memberPromotions, setMemberPromotions] = useState<Promotion[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  // Dynamic Divisions
  const [divisions, setDivisions] = useState<{ id: string; name: string }[]>([]);
  const [subDivisions, setSubDivisions] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    supabase.from('divisions').select('id, name').then(({ data }) => {
      setDivisions(data || []);
    });
  }, []);

  // Sub-divisions based on selected division
  useEffect(() => {
    if (filterDivision) {
      supabase.from('sub_divisions').select('id, name').eq('division_id', filterDivision)
        .then(({ data }) => {
          setSubDivisions(data || []);
        });
    } else {
      setSubDivisions([]);
      setFilterSubDivision('');
    }
  }, [filterDivision]);

  useEffect(() => {
    // Load donation statuses for current year
    const currentYear = new Date().getFullYear();
    supabase.from('donations').select('member_id, status').eq('year', currentYear)
      .then(({ data }) => {
        const map: Record<string, string> = {};
        for (const d of (data ?? [])) {
          map[d.member_id] = d.status;
        }
        setDonationStatusMap(map);
      });
  }, []);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('members').select('*', { count: 'exact' });

    if (search) {
      query = query.or(`name.ilike.%${search}%,employee_id.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }
    if (filterRole) query = query.eq('role', filterRole);
    if (filterDivision) query = query.eq('division_id', filterDivision);
    if (filterSubDivision) query = query.eq('sub_division_id', filterSubDivision);
    if (filterStatus) query = query.eq('status', filterStatus);

    // Sort
    const [sortField, sortDir] = sortBy.split('-');
    const ascending = sortDir === 'asc';
    if (sortField === 'name') query = query.order('name', { ascending });
    else if (sortField === 'joining') query = query.order('joining_date', { ascending, nullsFirst: false });
    else if (sortField === 'eid') query = query.order('employee_id', { ascending });

    query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const { data, count, error } = await query;
    if (!error) {
      let filtered = data as Member[];
      // Client-side donation status filter
      if (filterDonation) {
        filtered = filtered.filter(m => {
          const status = donationStatusMap[m.id];
          if (filterDonation === DONATION_STATUS.PAID) return status === DONATION_STATUS.PAID;
          if (filterDonation === DONATION_STATUS.PENDING) return status === DONATION_STATUS.PENDING || !status;
          return true;
        });
      }
      setMembers(filtered);
      setTotal(filterDonation ? filtered.length : (count ?? 0));
    }
    setLoading(false);
  }, [search, filterRole, filterDivision, filterSubDivision, filterStatus, filterDonation, sortBy, page, donationStatusMap]);

  useEffect(() => { setPage(0); }, [search, filterRole, filterDivision, filterSubDivision, filterStatus, filterDonation, sortBy]);
  useEffect(() => { loadMembers(); }, [loadMembers]);

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this member?')) return;
    setDeleting(id);
    const { error } = await supabase.from('members').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete member.');
    } else {
      toast.success('Member deleted.');
      loadMembers();
    }
    setDeleting(null);
  }

  async function openMemberDetail(m: Member) {
    setSelectedMember(m);
    setModalLoading(true);
    const [donRes, promoRes] = await Promise.all([
      supabase.from('donations').select('*').eq('member_id', m.id).order('year', { ascending: false }).limit(5),
      supabase.from('promotions').select('*').eq('member_id', m.id).order('promotion_date', { ascending: false }),
    ]);
    setMemberDonations((donRes.data as Donation[]) ?? []);
    setMemberPromotions((promoRes.data as Promotion[]) ?? []);
    setModalLoading(false);
  }

  // Export CSV
  function exportCSV() {
    const headers = ['Employee ID', 'Name', 'Role', 'Division', 'Sub Division', 'Phone', 'Email', 'Status', 'Joining Date'];
    const rows = members.map(m => [m.employee_id, m.name, m.role, m.division ?? '', m.sub_division ?? '', m.phone ?? '', m.email ?? '', m.status, m.joining_date ?? '']);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TPAS-Members-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Members exported to CSV!');
  }

  // Print
  function handlePrint() {
    const printContent = `
      <html><head><title>TPAS Members</title>
      <style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#0F2044;color:white}h1{color:#0F2044;font-size:18px}tr:nth-child(even){background:#f9f9f9}</style>
      </head><body>
      <h1>TPAS Kanniyakumari - Member Directory</h1>
      <p>Generated: ${new Date().toLocaleDateString()}</p>
      <table>
        <tr><th>ID</th><th>Name</th><th>Role</th><th>Division</th><th>Phone</th><th>Status</th><th>Joined</th></tr>
        ${members.map(m => `<tr><td>${m.employee_id}</td><td>${m.name}</td><td>${m.role}</td><td>${m.division ?? '—'}</td><td>${m.phone ?? '—'}</td><td>${m.status}</td><td>${m.joining_date ?? '—'}</td></tr>`).join('')}
      </table>
      </body></html>`;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(printContent);
      win.document.close();
      win.print();
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasActiveFilters = filterRole || filterDivision || filterSubDivision || filterStatus || filterDonation;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Member Directory</h2>
          <p className="text-sm text-muted-foreground">{total} members found</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border rounded-xl text-xs font-medium text-foreground hover:bg-muted transition-colors" title="Export CSV">
            <FileSpreadsheet className="w-3.5 h-3.5" /> CSV
          </button>
          <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border rounded-xl text-xs font-medium text-foreground hover:bg-muted transition-colors" title="Print">
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
          {canEdit && (
            <Link href="/admin?tab=members&action=add" className="flex items-center gap-2 px-4 py-2.5 gradient-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-md shadow-primary/20">
              <Plus className="w-4 h-4" />
              Add Member
            </Link>
          )}
        </div>
      </div>

      {/* Search + Filters */}
      <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, ID, email, or phone..."
              className="w-full pl-9 pr-4 py-2.5 bg-muted/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2.5 bg-muted/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn('flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all',
              showFilters || hasActiveFilters
                ? 'bg-primary text-white border-primary'
                : 'bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && <span className="w-2 h-2 bg-white rounded-full" />}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 animate-fade-in pt-2 border-t border-border">
            <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="px-3 py-2.5 bg-muted/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">All Roles</option>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select value={filterDivision} onChange={(e) => { setFilterDivision(e.target.value); setFilterSubDivision(''); }} className="px-3 py-2.5 bg-muted/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">All Divisions</option>
              {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select value={filterSubDivision} onChange={(e) => setFilterSubDivision(e.target.value)} disabled={!filterDivision} className="px-3 py-2.5 bg-muted/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50">
              <option value="">All Sub Divisions</option>
              {subDivisions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2.5 bg-muted/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filterDonation} onChange={(e) => setFilterDonation(e.target.value)} className="px-3 py-2.5 bg-muted/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">Donation Status</option>
              <option value={DONATION_STATUS.PAID}>Paid ({new Date().getFullYear()})</option>
              <option value={DONATION_STATUS.PENDING}>Pending ({new Date().getFullYear()})</option>
            </select>
          </div>
        )}
      </div>

      {/* Member Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-muted" />
                <div className="flex-1">
                  <div className="h-4 w-24 bg-muted rounded mb-2" />
                  <div className="h-3 w-16 bg-muted rounded" />
                </div>
              </div>
              <div className="h-3 w-full bg-muted rounded mb-2" />
              <div className="h-3 w-3/4 bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border">
          <UserCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-foreground font-medium">No members found</p>
          <p className="text-muted-foreground text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {members.map((m) => {
            const dStatus = donationStatusMap[m.id];
            return (
              <div
                key={m.id}
                className="bg-card rounded-2xl border border-border p-5 card-hover cursor-pointer group relative"
                onClick={() => openMemberDetail(m)}
              >
                {/* Status dot */}
                <div className={cn('absolute top-4 right-4 w-2.5 h-2.5 rounded-full',
                  m.status === 'Active' ? 'bg-emerald-500' :
                  m.status === 'Inactive' ? 'bg-gray-400' : 'bg-amber-500'
                )} title={m.status} />

                {/* Avatar + Name */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {m.photo_url
                      ? <img src={m.photo_url} alt="" className="w-full h-full rounded-full object-cover" />
                      : getInitials(m.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.employee_id}</p>
                  </div>
                </div>

                {/* Role badge */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={cn('inline-block text-xs px-2.5 py-0.5 rounded-full font-medium', ROLE_COLORS[m.role as Role])}>
                    {m.role}
                  </span>
                  {dStatus && (
                    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1',
                      dStatus === DONATION_STATUS.PAID ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                    )}>
                      {dStatus === DONATION_STATUS.PAID ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                      {dStatus === DONATION_STATUS.PAID ? 'Paid' : 'Pending'}
                    </span>
                  )}
                </div>

                {/* Division */}
                {m.division && (
                  <p className="text-xs text-muted-foreground truncate mb-1">📍 {m.division}</p>
                )}
                {m.sub_division && (
                  <p className="text-xs text-muted-foreground/70 truncate">↳ {m.sub_division}</p>
                )}

                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Since {formatDate(m.joining_date)}</p>
                  {canEdit && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); toast.info('Edit from Admin Panel'); }}
                        className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950 text-blue-600 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }}
                        disabled={deleting === m.id}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-red-600 transition-colors"
                        title="Delete"
                      >
                        {deleting === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => p - 1)}
              disabled={page === 0}
              className="p-2 rounded-xl border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors btn-interactive"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i).slice(
              Math.max(0, page - 2), Math.min(totalPages, page + 3)
            ).map((i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={cn('w-9 h-9 rounded-xl text-sm font-medium transition-all btn-interactive',
                  i === page ? 'gradient-primary text-white shadow-md' : 'border border-border hover:bg-muted text-muted-foreground'
                )}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= totalPages - 1}
              className="p-2 rounded-xl border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors btn-interactive"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Enhanced Member Detail Modal */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedMember(null)}>
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg p-6 animate-slide-up max-h-[90vh] overflow-y-auto scrollbar-thin" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center text-white font-bold text-xl">
                  {selectedMember.photo_url
                    ? <img src={selectedMember.photo_url} alt="" className="w-full h-full rounded-2xl object-cover" />
                    : getInitials(selectedMember.name)}
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-lg">{selectedMember.name}</h3>
                  <p className="text-muted-foreground text-sm">{selectedMember.employee_id}</p>
                  <span className={cn('inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium', ROLE_COLORS[selectedMember.role as Role])}>
                    {selectedMember.role}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedMember(null)} className="p-2 hover:bg-muted rounded-xl transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Basic Info */}
            <div className="space-y-3 border-t border-border pt-4">
              {[
                { label: 'Division', value: selectedMember.division },
                { label: 'Sub Division', value: selectedMember.sub_division },
                { label: 'Joining Date', value: formatDate(selectedMember.joining_date) },
                { label: 'Status', value: selectedMember.status },
              ].map(({ label, value }) => value && (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium text-foreground">{value}</span>
                </div>
              ))}
              {selectedMember.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-foreground">{selectedMember.phone}</span>
                </div>
              )}
              {selectedMember.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-foreground">{selectedMember.email}</span>
                </div>
              )}
            </div>

            {/* Promotion History */}
            <div className="mt-5 pt-4 border-t border-border">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h4 className="font-semibold text-foreground text-sm">Promotion History</h4>
              </div>
              {modalLoading ? (
                <div className="space-y-2">
                  {Array(2).fill(0).map((_, i) => <div key={i} className="h-8 bg-muted rounded-lg animate-pulse" />)}
                </div>
              ) : memberPromotions.length === 0 ? (
                <p className="text-xs text-muted-foreground">No promotions recorded.</p>
              ) : (
                <div className="space-y-2">
                  {memberPromotions.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-2.5 bg-muted/40 rounded-lg text-xs border border-border/50">
                      <div className="flex items-center gap-2">
                        <span className={cn('px-2 py-0.5 rounded-full font-medium', ROLE_COLORS[p.old_role as Role])}>{p.old_role}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className={cn('px-2 py-0.5 rounded-full font-medium', ROLE_COLORS[p.new_role as Role])}>{p.new_role}</span>
                      </div>
                      <span className="text-muted-foreground">{formatDate(p.promotion_date)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Donation Records */}
            <div className="mt-5 pt-4 border-t border-border">
              <div className="flex items-center gap-2 mb-3">
                <IndianRupee className="w-4 h-4 text-primary" />
                <h4 className="font-semibold text-foreground text-sm">Donation Records</h4>
              </div>
              {modalLoading ? (
                <div className="space-y-2">
                  {Array(3).fill(0).map((_, i) => <div key={i} className="h-8 bg-muted rounded-lg animate-pulse" />)}
                </div>
              ) : memberDonations.length === 0 ? (
                <p className="text-xs text-muted-foreground">No donation records found.</p>
              ) : (
                <div className="space-y-2">
                  {memberDonations.map((d) => (
                    <div key={d.id} className="flex items-center justify-between p-2.5 bg-muted/40 rounded-lg text-xs border border-border/50">
                      <div>
                        <span className="font-semibold text-foreground">{d.year}</span>
                        <span className="text-muted-foreground ml-2">{formatCurrency(d.amount)}</span>
                      </div>
                      <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full',
                        d.status === DONATION_STATUS.PAID ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                      )}>
                        {d.status === DONATION_STATUS.PAID ? 'Paid' : 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* View ID Card Link */}
            {(role === 'Admin' || role === 'President') && (
              <div className="mt-5 pt-4 border-t border-border">
                <Link
                  href={`/digital-id?member=${selectedMember.id}`}
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-primary/10 text-primary rounded-xl text-sm font-medium hover:bg-primary/20 transition-colors"
                  onClick={() => setSelectedMember(null)}
                >
                  <CreditCard className="w-4 h-4" /> View ID Card
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
