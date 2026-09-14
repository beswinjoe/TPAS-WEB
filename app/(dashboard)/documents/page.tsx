'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/client';
import { collection, getDocs, doc, deleteDoc, addDoc, query, orderBy } from 'firebase/firestore';
import { useAuth } from '@/lib/auth-context';
import type { Document, DocumentCategory, Role } from '@/types';
import { formatDate, cn } from '@/lib/utils';
import { CAN_UPLOAD_DOCUMENTS } from '@/lib/constants';
import { FolderOpen, Download, FileText, BookOpen, Scroll, BarChart3, FileCheck, Plus, X, Loader2, Upload, ExternalLink, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { CardSkeleton } from '@/components/ui/skeletons';
import { Modal } from '@/components/ui/modal';

const CATEGORIES: DocumentCategory[] = ['Membership Forms', 'Meeting Minutes', 'Rules', 'Annual Reports', 'Circulars'];

const CAT_ICONS: Record<DocumentCategory, React.ElementType> = {
  'Membership Forms': FileCheck,
  'Meeting Minutes': BookOpen,
  'Rules': Scroll,
  'Annual Reports': BarChart3,
  'Circulars': FileText,
};

const CAT_COLORS: Record<DocumentCategory, string> = {
  'Membership Forms': 'bg-muted text-muted-foreground',
  'Meeting Minutes': 'bg-muted text-muted-foreground',
  'Rules': 'bg-muted text-muted-foreground',
  'Annual Reports': 'bg-muted text-muted-foreground',
  'Circulars': 'bg-muted text-muted-foreground',
};

export default function DocumentsPage() {
  const { member, role } = useAuth();
  const canUpload = role && CAN_UPLOAD_DOCUMENTS.includes(role as Role);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<DocumentCategory | 'All'>('All');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: '', category: 'Membership Forms' as DocumentCategory, file_url: '' });

  useEffect(() => { loadDocuments(); }, []);

  async function loadDocuments() {
    setLoading(true);
    setError(null);
    try {
      const snap = await getDocs(query(collection(db, 'documents'), orderBy('created_at', 'desc')));
      setDocuments(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Document[]);
    } catch (error) {
      setError('Unable to load documents.');
    }
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.file_url) { toast.error('Please fill all fields.'); return; }
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'documents'), { ...form, uploaded_by: member!.id, created_at: new Date().toISOString() });
      toast.success('Document added!');
      setShowForm(false);
      setForm({ title: '', category: 'Membership Forms', file_url: '' });
      loadDocuments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add document.');
    }
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await deleteDoc(doc(db, 'documents', id));
      toast.success('Document deleted.');
      loadDocuments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete document.');
    }
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
            className="flex items-center gap-2 px-4 py-2.5 btn-primary"
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
                  ? 'bg-foreground text-background border-foreground'
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
      {error && !loading ? (
        <ErrorState message={error} onRetry={loadDocuments} />
      ) : loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={FolderOpen} title="No documents found" description="Documents will appear here when added." className="py-16 bg-card rounded-2xl border border-border" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((doc, i) => {
            const Icon = CAT_ICONS[doc.category as DocumentCategory] ?? FileText;
            return (
              <div key={doc.id} className="bg-card rounded-2xl border border-border p-5 card-hover group animate-fade-in relative" style={{ animationDelay: `${i * 60}ms` }}>
                {canUpload && (
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="absolute top-4 right-4 p-1.5 rounded-md hover:bg-muted hover:text-foreground text-muted-foreground opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete Document"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
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

      {/* Upload Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Upload Document"
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
              form="document-form"
              disabled={submitting}
              className="w-full sm:w-auto px-6 h-12 rounded-xl text-sm font-medium bg-foreground text-background hover:bg-foreground/90 transition-colors disabled:opacity-70 flex items-center justify-center min-w-[160px]"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Upload className="w-4 h-4 mr-2" />Upload Document</>}
            </button>
          </>
        }
      >
        <form id="document-form" onSubmit={handleCreate} className="space-y-6">
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Document Title *</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Annual Report 2025"
              className="w-full px-4 h-12 bg-muted/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground transition-all"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Category</label>
            <select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value as DocumentCategory }))}
              className="w-full px-4 h-12 bg-muted/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground transition-all"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">File URL / Path *</label>
            <input
              value={form.file_url}
              onChange={e => setForm(f => ({ ...f, file_url: e.target.value }))}
              placeholder="https://... or /documents/file.pdf"
              className="w-full px-4 h-12 bg-muted/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground transition-all"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
