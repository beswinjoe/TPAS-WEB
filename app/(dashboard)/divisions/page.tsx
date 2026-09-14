'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/client';
import { collection, getDocs, query, orderBy, where, getDoc, doc } from 'firebase/firestore';
import type { Division, Member, SubDivision } from '@/types';
import { Building2, ChevronDown, ChevronUp, Crown } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { CardSkeleton } from '@/components/ui/skeletons';

export default function DivisionsPage() {
  const [divisions, setDivisions] = useState<(Division & { head?: Member; memberCount: number })[]>([]);
  const [members, setMembers] = useState<Record<string, Member[]>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const divSnap = await getDocs(query(collection(db, 'divisions'), orderBy('name', 'asc')));
      const subDivSnap = await getDocs(collection(db, 'sub_divisions'));
      const memSnap = await getDocs(query(collection(db, 'members'), where('status', '==', 'Active')));

      const allMembers = memSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Member[];
      const subDivs = subDivSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      const divData = divSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

      // Group members by division_id
      const byDiv: Record<string, Member[]> = {};
      for (const m of allMembers) {
        if (!m.division_id) continue;
        if (!byDiv[m.division_id]) byDiv[m.division_id] = [];
        byDiv[m.division_id].push(m);
      }
      setMembers(byDiv);

      // Attach head + count
      const withMeta = await Promise.all(divData.map(async (d) => {
        let head: Member | undefined;
        if (d.president_id) {
          const mSnap = await getDoc(doc(db, 'members', d.president_id));
          if (mSnap.exists()) head = { id: mSnap.id, ...mSnap.data() } as Member;
        }
        return { 
          ...d, 
          head, 
          memberCount: byDiv[d.id]?.length ?? 0,
          sub_divisions: subDivs.filter(s => s.division_id === d.id) 
        } as Division & { head?: Member; memberCount: number; sub_divisions: any[] };
      }));

      setDivisions(withMeta);
    } catch (e) {
      setError('Unable to load divisions.');
    }
    setLoading(false);
  }

  const toggleExpand = (id: string) => setExpanded(expanded === id ? null : id);

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-5 animate-pulse">
              <div className="h-4 w-16 bg-muted rounded mb-2" />
              <div className="h-8 w-12 bg-muted rounded" />
            </div>
          ))
        ) : (
          <>
            <div className="bg-card rounded-xl border border-border p-5">
              <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Divisions</p>
              <p className="text-xl font-bold text-foreground text-foreground">{divisions.length}</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-5">
              <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Sub Divisions</p>
              <p className="text-xl font-bold text-foreground text-foreground">{divisions.reduce((s, d) => s + (d.sub_divisions?.length || 0), 0)}</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-5">
              <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Total Members</p>
              <p className="text-xl font-bold text-foreground text-foreground">{divisions.reduce((s, d) => s + d.memberCount, 0)}</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-5">
              <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Avg. per Division</p>
              <p className="text-xl font-bold text-foreground text-foreground">
                {divisions.length ? Math.round(divisions.reduce((s, d) => s + d.memberCount, 0) / divisions.length) : 0}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Division Cards */}
      <div className="space-y-4">
        {error && !loading ? (
          <ErrorState message={error} onRetry={loadData} />
        ) : loading ? (
          Array(5).fill(0).map((_, i) => (
            <CardSkeleton key={i} />
          ))
        ) : divisions.length === 0 ? (
          <EmptyState icon={Building2} title="No divisions" description="There are no divisions configured in the system." className="py-16" />
        ) : (
          divisions.map((div, idx) => {
            const divMembers = members[div.id] ?? [];
            const isOpen = expanded === div.id;
            return (
              <div key={div.id} className="bg-card rounded-2xl border border-border overflow-hidden animate-fade-in" style={{ animationDelay: `${idx * 80}ms` }}>
                {/* Division Header */}
                <button
                  onClick={() => toggleExpand(div.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-foreground text-background flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground">{div.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {div.sub_divisions?.length || 0} sub-divisions · {div.memberCount} members
                    </p>
                  </div>
                  {div.head && (
                    <div className="hidden sm:flex items-center gap-2 shrink-0">
                      <Crown className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">{div.head.name}</span>
                    </div>
                  )}
                  <div className="shrink-0 text-muted-foreground">
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {/* Expanded Content */}
                {isOpen && (
                  <div className="border-t border-border animate-fade-in">
                    {/* Sub Divisions */}
                    <div className="px-5 py-4 border-b border-border">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Sub Divisions</p>
                      <div className="flex flex-wrap gap-2">
                        {div.sub_divisions?.map((sub) => {
                          const count = divMembers.filter(m => m.sub_division_id === sub.id).length;
                          return (
                            <span key={sub.id} className="text-xs bg-muted border border-border rounded-lg px-2.5 py-1 text-foreground">
                              {sub.name} <span className="text-muted-foreground">({count})</span>
                            </span>
                          );
                        })}
                        {(!div.sub_divisions || div.sub_divisions.length === 0) && (
                           <p className="text-muted-foreground text-sm">No sub-divisions found.</p>
                        )}
                      </div>
                    </div>

                    {/* Members List */}
                    <div className="px-5 py-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                        Members ({divMembers.length})
                      </p>
                      {divMembers.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No members assigned.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {divMembers.slice(0, 9).map((m) => (
                            <div key={m.id} className="flex items-center gap-2 p-2.5 bg-muted/40 rounded-xl border border-border/50">
                              <div className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center text-background text-xs font-bold shrink-0">
                                {m.photo_url ? <img src={m.photo_url} alt="" className="w-full h-full rounded-full object-cover" /> : getInitials(m.name)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-foreground truncate">{m.name}</p>
                                <p className="text-xs text-muted-foreground">{m.employee_id}</p>
                              </div>
                            </div>
                          ))}
                          {divMembers.length > 9 && (
                            <div className="flex items-center justify-center p-2.5 bg-muted/20 rounded-xl border border-border/50 border-dashed">
                              <p className="text-xs text-muted-foreground">+{divMembers.length - 9} more</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
