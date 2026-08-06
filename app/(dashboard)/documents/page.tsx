'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import type { Document, DocumentCategory, Role } from '@/types';
import { formatDate, cn } from '@/lib/utils';
import { CAN_UPLOAD_DOCUMENTS } from '@/lib/constants';
import { FolderOpen, Download, FileText, BookOpen, Scroll, BarChart3, FileCheck, Plus, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES: DocumentCategory[] = ['Membership Forms', 'Meeting Minutes', 'Rules', 'Annual Reports', 'Circulars'];

const CAT_ICONS: Record<DocumentCategory, React.ElementType> = {
  'Membership Forms': FileCheck,
  'Meeting Minutes': BookOpen,
  'Rules': Scroll,
  'Annual Reports': BarChart3,
  'Circulars': FileText,
};

const CAT_COLORS: Record<DocumentCategory, string> = {
  'Membership Forms': 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
  'Meeting Minutes': 'bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400',
  'Rules': 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400',
  'Annual Reports': 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
  'Circulars': 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
};

export default function DocumentsPage() {
  const { member, role } = useAuth();
  const supabase = createClient();
  const canUpload = role && CAN_UPLOAD_DOCUMENTS.includes(role as Role);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<DocumentCategory | 'All'>('All');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: '', category: 'Membership Forms' as DocumentCategory, file_url: '' });

  useEffect(() => { loadDocuments(); }, []);

  async function loadDocuments() {
    const { data } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
    setDocuments((data as Document[]) ?? []);
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.file_url) { toast.error('Please fill all fields.'); return; }
    setSubmitting(true);
    const { error } = await supabase.from('documents').insert({ ...form, uploaded_by: member!.id });
    if (error) { toast.error('Failed to add document.'); }
    else { toast.success('Document added!'); setShowForm(false); setForm({ title: '', category: 'Membership Forms', file_url: '' }); loadDocuments(); }
    setSubmitting(false);
  }

  const filtered = activeCategory === 'All' ? documents : documents.filter(d => d.category === activeCategory);

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Document Center</h2>
          <p className="text-sm text-muted-foreground">Secure access to all organizational documents</p>
        </div>
        {canUpload && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 gradient-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-md shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            Add Document
          </button>
        )}
      </div>

      {/* Category Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['All', ...CATEGORIES] as const).map((cat) => {
          const count = cat === 'All' ? documents.length : documents.filter(d => d.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all border',
                activeCategory === cat
                  ? 'gradient-primary text-white border-transparent shadow-md'
                  : 'bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground'
              )}
            >
              {cat}
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full',
                activeCategory === cat ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Documents Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-5 animate-pulse">
              <div className="w-12 h-12 bg-muted rounded-xl mb-3" />
              <div className="h-4 w-3/4 bg-muted rounded mb-2" />
              <div className="h-3 w-1/2 bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border">
          <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-foreground font-medium">No documents found</p>
          <p className="text-muted-foreground text-sm mt-1">Documents will appear here when added</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((doc, i) => {
            const Icon = CAT_ICONS[doc.category as DocumentCategory] ?? FileText;
            return (
              <div key={doc.id} className="bg-card rounded-2xl border border-border p-5 card-hover group animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-4', CAT_COLORS[doc.category as DocumentCategory])}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-foreground text-sm leading-snug mb-1">{doc.title}</h3>
                <span className="text-xs text-muted-foreground">{doc.category}</span>
                <p className="text-xs text-muted-foreground/70 mt-1">Added {formatDate(doc.created_at)}</p>
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => toast.info('Opening document...')}
                  className="mt-4 w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-all group-hover:shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download PDF
                </a>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowForm(false)}>
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground">Add Document</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Document Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Annual Report 2025" className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as DocumentCategory }))} className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">File URL / Path *</label>
                <input value={form.file_url} onChange={e => setForm(f => ({ ...f, file_url: e.target.value }))} placeholder="https://... or /documents/file.pdf" className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2.5 gradient-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-70">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
