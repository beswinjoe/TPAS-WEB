'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/client';
import { collection, getDocs, doc, deleteDoc, addDoc, query, orderBy, where } from 'firebase/firestore';
import { useAuth } from '@/lib/auth-context';
import type { Announcement, AnnouncementCategory, Role } from '@/types';
import { formatDate, cn } from '@/lib/utils';
import { CAN_CREATE_ANNOUNCEMENTS } from '@/lib/constants';
import { Megaphone, Plus, X, Search, Paperclip, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ListSkeleton } from '@/components/ui/skeletons';
import { Modal } from '@/components/ui/modal';

const CATEGORIES: AnnouncementCategory[] = ['General', 'Important', 'Event', 'Finance', 'Circular'];
const CAT_COLORS: Record<AnnouncementCategory, string> = {
  General: 'bg-muted text-muted-foreground border-border',
  Important: 'bg-foreground text-background border-foreground',
  Event: 'bg-muted text-muted-foreground border-border',
  Finance: 'bg-muted text-muted-foreground border-border',
  Circular: 'bg-muted text-muted-foreground border-border',
};

export default function AnnouncementsPage() {
  const { member, role } = useAuth();
  const canCreate = role && CAN_CREATE_ANNOUNCEMENTS.includes(role as Role);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<Announcement | null>(null);
  const [form, setForm] = useState({ title: '', description: '', category: 'General' as AnnouncementCategory });

  useEffect(() => { loadAnnouncements(); }, [search, filterCat]);

  async function loadAnnouncements() {
    setLoading(true);
    setError(null);
    try {
      let q = query(collection(db, 'announcements'), orderBy('date', 'desc'));
      if (filterCat) q = query(q, where('category', '==', filterCat));
      
      const snap = await getDocs(q);
      let allData = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Announcement[];
      
      if (search) {
        const lower = search.toLowerCase();
        allData = allData.filter(a => a.title.toLowerCase().includes(lower));
      }
      
      setAnnouncements(allData);
    } catch (e) {
      setError('Unable to load announcements.');
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      toast.error('Please fill all fields.');
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'announcements'), {
        ...form,
        posted_by: member!.id,
        date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
      });
      toast.success('Announcement posted!');
      setShowForm(false);
      setForm({ title: '', description: '', category: 'General' });
      loadAnnouncements();
    } catch (error: any) {
      toast.error(error.message || 'Failed to post announcement.');
    }
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await deleteDoc(doc(db, 'announcements', id));
      toast.success('Announcement deleted.');
      loadAnnouncements();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete announcement.');
    }
  }

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Announcements</h2>
          <p className="text-sm text-muted-foreground">{announcements.length} announcements</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 btn-primary"
          >
            <Plus className="w-4 h-4" />
            New Announcement
          </button>
        )}
      </div>

      {/* Search + Filter */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search announcements..."
            className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
        </div>
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="px-3 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Announcements List */}
      <div className="space-y-3">
        {error && !loading ? (
          <ErrorState message={error} onRetry={loadAnnouncements} />
        ) : loading ? (
          <ListSkeleton items={4} />
        ) : announcements.length === 0 ? (
          <EmptyState icon={Megaphone} title={search || filterCat ? 'No matching announcements' : 'No announcements'} description={search || filterCat ? 'Try adjusting your filters.' : 'Check back later for updates.'} className="py-16 bg-card rounded-2xl border border-border" />
        ) : (
          announcements.map((ann, i) => (
            <div
              key={ann.id}
              className="bg-card rounded-2xl border border-border p-5 card-hover cursor-pointer animate-fade-in"
              style={{ animationDelay: `${i * 60}ms` }}
              onClick={() => setSelected(ann)}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  'shrink-0 mt-0.5 w-2.5 h-2.5 rounded-full',
                  ann.category === 'Important' ? 'bg-foreground' :
                  ann.category === 'Finance' ? 'bg-muted-foreground' :
                  ann.category === 'Event' ? 'bg-muted-foreground/60' :
                  ann.category === 'Circular' ? 'bg-muted-foreground/40' : 'bg-foreground'
                )} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-semibold text-foreground leading-snug">{ann.title}</h3>
                    <div className="flex items-center gap-2">
                      <span className={cn('shrink-0 text-xs font-medium px-2.5 py-0.5 rounded-full border', CAT_COLORS[ann.category as AnnouncementCategory])}>
                        {ann.category}
                      </span>
                      {canCreate && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(ann.id); }}
                          className="p-1 rounded-md hover:bg-muted hover:text-foreground text-muted-foreground transition-colors shrink-0"
                          title="Delete"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{ann.description}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-xs text-muted-foreground/70">{formatDate(ann.date)}</span>
                    {ann.attachments && ann.attachments.length > 0 && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Paperclip className="w-3 h-3" />
                        {ann.attachments.length} attachment{ann.attachments.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <Modal
          isOpen={!!selected}
          onClose={() => setSelected(null)}
          title={
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-foreground">{selected.title}</h2>
              <span className={cn('text-xs font-medium px-2.5 py-0.5 rounded-full border', CAT_COLORS[selected.category as AnnouncementCategory])}>
                {selected.category}
              </span>
            </div>
          }
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">{formatDate(selected.date)}</p>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{selected.description}</p>
          </div>
        </Modal>
      )}

      {/* Create Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="New Announcement"
        maxWidth="max-w-2xl"
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
              disabled={submitting}
              onClick={handleSubmit}
              className="w-full sm:w-auto px-6 h-12 rounded-xl text-sm font-medium bg-foreground text-background hover:bg-foreground/90 transition-colors disabled:opacity-70 flex items-center justify-center min-w-[160px]"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Post Announcement'}
            </button>
          </>
        }
      >
        <form id="announcement-form" onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Title *</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Announcement title"
              className="w-full px-4 h-12 bg-muted/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground transition-all"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Category</label>
            <select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value as AnnouncementCategory }))}
              className="w-full px-4 h-12 bg-muted/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground transition-all"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Description *</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Write the announcement details..."
              className="w-full px-4 py-3 min-h-[130px] bg-muted/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground transition-all resize-none"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
