'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import type { Member, Role } from '@/types';
import { formatDate, getInitials, cn } from '@/lib/utils';
import { ROLE_COLORS, CAN_EDIT_MEMBERS, DIVISIONS } from '@/lib/constants';
import {
  Search, Filter, X, Edit2, Trash2, Phone, Mail,
  ChevronLeft, ChevronRight, UserCircle, Loader2, Plus
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

const ROLES: Role[] = ['President', 'Secretary', 'Treasurer', 'Member', 'Admin'];
const STATUS_OPTIONS = ['Active', 'Inactive', 'Pending'];
const PAGE_SIZE = 12;

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
  const [filterStatus, setFilterStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('members').select('*', { count: 'exact' });

    if (search) {
      query = query.or(`name.ilike.%${search}%,employee_id.ilike.%${search}%,email.ilike.%${search}%`);
    }
    if (filterRole) query = query.eq('role', filterRole);
    if (filterDivision) query = query.eq('division', filterDivision);
    if (filterStatus) query = query.eq('status', filterStatus);

    query = query
      .order('name')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const { data, count, error } = await query;
    if (!error) {
      setMembers(data as Member[]);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [search, filterRole, filterDivision, filterStatus, page]);

  useEffect(() => { setPage(0); }, [search, filterRole, filterDivision, filterStatus]);
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

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasActiveFilters = filterRole || filterDivision || filterStatus;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Member Directory</h2>
          <p className="text-sm text-muted-foreground">{total} members found</p>
        </div>
        {canEdit && (
          <Link href="/admin?tab=members&action=add" className="flex items-center gap-2 px-4 py-2.5 gradient-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-md shadow-primary/20">
            <Plus className="w-4 h-4" />
            Add Member
          </Link>
        )}
      </div>

      {/* Search + Filters */}
      <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, Employee ID, or email..."
              className="w-full pl-9 pr-4 py-2.5 bg-muted/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-in pt-2 border-t border-border">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-3 py-2.5 bg-muted/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">All Roles</option>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select
              value={filterDivision}
              onChange={(e) => setFilterDivision(e.target.value)}
              className="px-3 py-2.5 bg-muted/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">All Divisions</option>
              {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2.5 bg-muted/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
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
          {members.map((m) => (
            <div
              key={m.id}
              className="bg-card rounded-2xl border border-border p-5 card-hover cursor-pointer group relative"
              onClick={() => setSelectedMember(m)}
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
              <span className={cn('inline-block text-xs px-2.5 py-0.5 rounded-full font-medium mb-3', ROLE_COLORS[m.role as Role])}>
                {m.role}
              </span>

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
          ))}
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
              className="p-2 rounded-xl border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i).slice(
              Math.max(0, page - 2), Math.min(totalPages, page + 3)
            ).map((i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={cn('w-9 h-9 rounded-xl text-sm font-medium transition-all',
                  i === page ? 'gradient-primary text-white shadow-md' : 'border border-border hover:bg-muted text-muted-foreground'
                )}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= totalPages - 1}
              className="p-2 rounded-xl border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Member Detail Modal */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedMember(null)}>
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
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
          </div>
        </div>
      )}
    </div>
  );
}
