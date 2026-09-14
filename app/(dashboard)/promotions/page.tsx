'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/client';
import { collection, getDocs, doc, query, orderBy, where, getDoc } from 'firebase/firestore';
import { useAuth } from '@/lib/auth-context';
import type { Promotion, Role } from '@/types';
import { formatDate, cn } from '@/lib/utils';
import { ROLE_COLORS } from '@/lib/constants';
import { TrendingUp, ArrowDown, BadgeCheck } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ListSkeleton } from '@/components/ui/skeletons';

const ROLE_ORDER: Role[] = ['Member', 'Treasurer', 'Secretary', 'President'];

export default function PromotionsPage() {
  const { member } = useAuth();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [approvers, setApprovers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (member) loadData();
  }, [member]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const snap = await getDocs(query(collection(db, 'promotions'), where('member_id', '==', member!.id), orderBy('promotion_date', 'desc')));
      const promos = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Promotion[];
      setPromotions(promos);

      // Fetch approver names
      const approverIds = [...new Set(promos.map(p => p.approved_by).filter(Boolean))];
      if (approverIds.length > 0) {
        const map: Record<string, string> = {};
        for (const id of approverIds) {
          const docSnap = await getDoc(doc(db, 'members', id));
          if (docSnap.exists()) map[id] = docSnap.data().name;
        }
        setApprovers(map);
      }
    } catch (error) {
      setError('Unable to load promotion history.');
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-foreground text-background rounded-xl">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-foreground">Promotion History</h2>
            <p className="text-sm text-muted-foreground">Your career progression in TPAS</p>
          </div>
        </div>

        {/* Role Hierarchy */}
        <div className="flex items-center gap-2 flex-wrap">
          {ROLE_ORDER.map((r, i) => (
            <div key={r} className="flex items-center gap-2">
              <span className={cn(
                'text-xs font-semibold px-3 py-1.5 rounded-full border-2',
                member?.role === r
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-muted text-muted-foreground'
              )}>
                {r}
                {member?.role === r && ' ✓'}
              </span>
              {i < ROLE_ORDER.length - 1 && (
                <ArrowDown className="w-3.5 h-3.5 text-muted-foreground rotate-[-90deg]" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <BadgeCheck className="w-4.5 h-4.5 text-primary" />
          <h3 className="font-semibold text-foreground">Promotion Timeline</h3>
        </div>

        {error && !loading ? (
          <ErrorState message={error} onRetry={loadData} />
        ) : loading ? (
          <div className="p-6">
            <ListSkeleton items={3} />
          </div>
        ) : promotions.length === 0 ? (
          <EmptyState icon={TrendingUp} title="No promotions yet" description="Your promotion history will appear here." className="py-16" />
        ) : (
          <div className="p-6">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-5 top-5 bottom-0 w-px bg-border" />

              <div className="space-y-6">
                {promotions.map((p, i) => (
                  <div key={p.id} className="flex gap-4 relative animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
                    <div className="shrink-0 w-10 h-10 rounded-full bg-foreground flex items-center justify-center text-background z-10">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div className="flex-1 bg-muted/40 rounded-xl p-4 border border-border/50">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn('text-xs font-semibold px-2.5 py-0.5 rounded-full', ROLE_COLORS[p.old_role as Role])}>
                              {p.old_role}
                            </span>
                            <ArrowDown className="w-3.5 h-3.5 text-muted-foreground rotate-[-90deg]" />
                            <span className={cn('text-xs font-semibold px-2.5 py-0.5 rounded-full', ROLE_COLORS[p.new_role as Role])}>
                              {p.new_role}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-foreground mt-2">
                            Promoted to {p.new_role}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Approved by: {approvers[p.approved_by] ?? 'Admin'}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-semibold text-foreground">{formatDate(p.promotion_date)}</p>
                          <span className="text-xs text-foreground font-medium">✓ Confirmed</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Initial Member */}
                <div className="flex gap-4 relative">
                  <div className="shrink-0 w-10 h-10 rounded-full bg-muted border-2 border-border flex items-center justify-center text-muted-foreground z-10">
                    <span className="text-xs font-bold">M</span>
                  </div>
                  <div className="flex-1 bg-muted/20 rounded-xl p-4 border border-border/50">
                    <p className="text-sm font-semibold text-foreground">Joined as Member</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(member?.joining_date)} — {member?.division ?? 'Division not assigned'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
