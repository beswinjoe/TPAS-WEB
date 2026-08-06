'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Division, Member } from '@/types';
import { Building2, Users, ChevronDown, ChevronUp, Crown } from 'lucide-react';
import { getInitials } from '@/lib/utils';

export default function DivisionsPage() {
  const supabase = createClient();
  const [divisions, setDivisions] = useState<(Division & { head?: Member; memberCount: number })[]>([]);
  const [members, setMembers] = useState<Record<string, Member[]>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [divRes, memRes] = await Promise.all([
      supabase.from('divisions').select('*'),
      supabase.from('members').select('*').eq('status', 'Active'),
    ]);

    const allMembers = (memRes.data as Member[]) ?? [];
    const divData = (divRes.data as Division[]) ?? [];

    // Group members by division
    const byDiv: Record<string, Member[]> = {};
    for (const m of allMembers) {
      if (!m.division) continue;
      if (!byDiv[m.division]) byDiv[m.division] = [];
      byDiv[m.division].push(m);
    }
    setMembers(byDiv);

    // Attach head + count
    const withMeta = await Promise.all(divData.map(async (d) => {
      let head: Member | undefined;
      if (d.head_member_id) {
        const { data } = await supabase.from('members').select('*').eq('id', d.head_member_id).single();
        head = data as Member;
      }
      return { ...d, head, memberCount: byDiv[d.name]?.length ?? 0 };
    }));

    setDivisions(withMeta);
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
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-5 text-white shadow-lg">
              <p className="text-blue-200 text-xs uppercase tracking-wide mb-1">Divisions</p>
              <p className="text-3xl font-bold">{divisions.length}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl p-5 text-white shadow-lg">
              <p className="text-purple-200 text-xs uppercase tracking-wide mb-1">Sub Divisions</p>
              <p className="text-3xl font-bold">{divisions.reduce((s, d) => s + d.sub_divisions.length, 0)}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white shadow-lg">
              <p className="text-emerald-200 text-xs uppercase tracking-wide mb-1">Total Members</p>
              <p className="text-3xl font-bold">{divisions.reduce((s, d) => s + d.memberCount, 0)}</p>
            </div>
            <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 text-white shadow-lg">
              <p className="text-amber-200 text-xs uppercase tracking-wide mb-1">Avg. per Division</p>
              <p className="text-3xl font-bold">
                {divisions.length ? Math.round(divisions.reduce((s, d) => s + d.memberCount, 0) / divisions.length) : 0}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Division Cards */}
      <div className="space-y-4">
        {loading ? (
          Array(5).fill(0).map((_, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-5 animate-pulse">
              <div className="h-5 w-48 bg-muted rounded mb-3" />
              <div className="h-4 w-full bg-muted rounded" />
            </div>
          ))
        ) : (
          divisions.map((div, idx) => {
            const divMembers = members[div.name] ?? [];
            const isOpen = expanded === div.id;
            return (
              <div key={div.id} className="bg-card rounded-2xl border border-border overflow-hidden animate-fade-in" style={{ animationDelay: `${idx * 80}ms` }}>
                {/* Division Header */}
                <button
                  onClick={() => toggleExpand(div.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground">{div.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {div.sub_divisions.length} sub-divisions · {div.memberCount} members
                    </p>
                  </div>
                  {div.head && (
                    <div className="hidden sm:flex items-center gap-2 shrink-0">
                      <Crown className="w-3.5 h-3.5 text-amber-500" />
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
                        {div.sub_divisions.map((sub) => {
                          const count = divMembers.filter(m => m.sub_division === sub).length;
                          return (
                            <span key={sub} className="text-xs bg-muted border border-border rounded-lg px-2.5 py-1 text-foreground">
                              {sub} <span className="text-muted-foreground">({count})</span>
                            </span>
                          );
                        })}
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
                              <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
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
