'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import type { Announcement, AnnouncementCategory, Role } from '@/types';
import { formatDate, cn } from '@/lib/utils';
import { CAN_CREATE_ANNOUNCEMENTS } from '@/lib/constants';
import { Megaphone, Plus, X, Search, Paperclip, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES: AnnouncementCategory[] = ['General', 'Important', 'Event', 'Finance', 'Circular'];
const CAT_COLORS: Record<AnnouncementCategory, string> = {
  General: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800',
  Important: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800',
  Event: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800',
  Finance: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800',
  Circular: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-400 dark:border-teal-800',
};

export default function AnnouncementsPage() {
  const { member, role } = useAuth();
  const supabase = createClient();
  const canCreate = role && CAN_CREATE_ANNOUNCEMENTS.includes(role as Role);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<Announcement | null>(null);
  const [form, setForm] = useState({ title: '', description: '', category: 'General' as AnnouncementCategory });

  useEffect(() => { loadAnnouncements(); }, [search, filterCat]);

  async function loadAnnouncements() {
    setLoading(true);
    let query = supabase.from('announcements').select('*').order('date', { ascending: false });
    if (search) query = query.ilike('title', `%${search}%`);
    if (filterCat) query = query.eq('category', filterCat);
    const { data } = await query;
    setAnnouncements((data as Announcement[]) ?? []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      toast.error('Please fill all fields.');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('announcements').insert({
      ...form,
      posted_by: member!.id,
      date: new Date().toISOString().split('T')[0],
    });
    if (error) {
      toast.error('Failed to post announcement.');
    } else {
      toast.success('Announcement posted!');
      setShowForm(false);
      setForm({ title: '', description: '', category: 'General' });
      loadAnnouncements();
    }
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete announcement.');
    } else {
      toast.success('Announcement deleted.');
      loadAnnouncements();
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
            className="flex items-center gap-2 px-4 py-2.5 gradient-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-md shadow-primary/20"
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
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-5 animate-pulse">
              <div className="h-5 w-2/3 bg-muted rounded mb-3" />
              <div className="h-4 w-full bg-muted rounded mb-2" />
              <div className="h-4 w-3/4 bg-muted rounded" />
            </div>
          ))
        ) : announcements.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl border border-border">
            <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground font-medium">No announcements</p>
            <p className="text-muted-foreground text-sm mt-1">Check back later for updates</p>
          </div>
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
                  ann.category === 'Important' ? 'bg-red-500' :
                  ann.category === 'Finance' ? 'bg-amber-500' :
                  ann.category === 'Event' ? 'bg-purple-500' :
                  ann.category === 'Circular' ? 'bg-teal-500' : 'bg-blue-500'
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
                          className="p-1 rounded-md hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400 text-muted-foreground transition-colors shrink-0"
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setSelected(null)}>
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg p-6 animate-slide-up max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <span className={cn('text-xs font-medium px-2.5 py-0.5 rounded-full border', CAT_COLORS[selected.category as AnnouncementCategory])}>
                {selected.category}
              </span>
              <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <h2 className="text-lg font-bold text-foreground mb-2">{selected.title}</h2>
            <p className="text-xs text-muted-foreground mb-4">{formatDate(selected.date)}</p>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{selected.description}</p>
          </div>
        </div>
      )}

      {/* Create Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowForm(false)}>
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground">New Announcement</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Title *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Announcement title"
                  className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value as AnnouncementCategory }))}
                  className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Description *</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Write the announcement details..."
                  rows={5}
                  className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 gradient-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
