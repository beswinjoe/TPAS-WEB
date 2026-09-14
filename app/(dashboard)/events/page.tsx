'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/client';
import { collection, getDocs, doc, deleteDoc, updateDoc, addDoc, query, orderBy } from 'firebase/firestore';
import { useAuth } from '@/lib/auth-context';
import type { Event, Role } from '@/types';
import { formatDate, cn } from '@/lib/utils';
import { CAN_MANAGE_EVENTS } from '@/lib/constants';
import { CalendarDays, MapPin, Clock, Users, CheckCircle2, Plus, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { CardSkeleton } from '@/components/ui/skeletons';
import { Modal } from '@/components/ui/modal';

export default function EventsPage() {
  const { member, role } = useAuth();
  const canManage = role && CAN_MANAGE_EVENTS.includes(role as Role);

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rsvping, setRsvping] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: '', venue: '', description: '', date: '', time: '' });

  useEffect(() => { loadEvents(); }, []);

  async function loadEvents() {
    setLoading(true);
    setError(null);
    try {
      const snap = await getDocs(query(collection(db, 'events'), orderBy('date', 'asc')));
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Event[]);
    } catch (e) {
      setError('Unable to load events.');
    }
    setLoading(false);
  }

  function hasRsvped(event: Event): boolean {
    return (event.rsvps ?? []).includes(member?.id ?? '');
  }

  async function handleRsvp(event: Event) {
    if (!member) return;
    setRsvping(event.id);
    const currentRsvps = event.rsvps ?? [];
    const already = hasRsvped(event);
    const newRsvps = already
      ? currentRsvps.filter(id => id !== member.id)
      : [...currentRsvps, member.id];

    try {
      await updateDoc(doc(db, 'events', event.id), { rsvps: newRsvps });
      toast.success(already ? 'RSVP cancelled.' : 'RSVP confirmed! 🎉');
      setEvents(evs => evs.map(e => e.id === event.id ? { ...e, rsvps: newRsvps } : e));
    } catch (e) {
      toast.error('Failed to update RSVP.');
    }
    setRsvping(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.venue || !form.date || !form.time) {
      toast.error('Please fill all required fields.');
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'events'), {
        ...form,
        rsvps: [],
        created_at: new Date().toISOString(),
      });
      toast.success('Event created!');
      setShowForm(false);
      setForm({ title: '', venue: '', description: '', date: '', time: '' });
      loadEvents();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create event.');
    }
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      await deleteDoc(doc(db, 'events', id));
      toast.success('Event deleted.');
      loadEvents();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete event.');
    }
  }

  const today = new Date().toISOString().split('T')[0];
  const upcoming = events.filter(e => e.date >= today);
  const past = events.filter(e => e.date < today);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Events & Meetings</h2>
          <p className="text-sm text-muted-foreground">{upcoming.length} upcoming events</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 btn-primary"
          >
            <Plus className="w-4 h-4" />
            Add Event
          </button>
        )}
      </div>

      {/* Upcoming Events */}
      {error && !loading ? (
        <ErrorState message={error} onRetry={loadEvents} />
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : events.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No events" description="There are no upcoming or past events." className="py-12" />
      ) : (
        <>
          {upcoming.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Upcoming</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcoming.map((event, i) => {
                  const rsvped = hasRsvped(event);
                  const rsvpCount = (event.rsvps ?? []).length;
                  return (
                    <div
                      key={event.id}
                      className="bg-card rounded-2xl border border-border overflow-hidden card-hover animate-fade-in"
                      style={{ animationDelay: `${i * 80}ms` }}
                    >
                      {/* Color bar */}
                      <div className="h-1 bg-foreground" />
                      <div className="p-5">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="shrink-0 w-12 h-12 rounded-xl bg-foreground flex flex-col items-center justify-center text-background text-center shadow-md">
                            <span className="text-xs font-medium leading-none">{formatDate(event.date).split(' ')[1]}</span>
                            <span className="text-lg font-bold leading-none">{formatDate(event.date).split(' ')[0]}</span>
                          </div>
                          <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-bold text-foreground text-sm leading-snug">{event.title}</h3>
                              {rsvped && (
                                <span className="inline-flex items-center gap-1 text-xs text-foreground font-medium mt-0.5">
                                  <CheckCircle2 className="w-3 h-3" /> RSVP'd
                                </span>
                              )}
                            </div>
                            {canManage && (
                              <button
                                onClick={() => handleDelete(event.id)}
                                className="p-1.5 rounded-md hover:bg-muted hover:text-foreground text-muted-foreground transition-colors shrink-0"
                                title="Delete Event"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1.5 mb-4">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{event.venue}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>{event.time}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Users className="w-3.5 h-3.5 shrink-0" />
                            <span>{rsvpCount} {rsvpCount === 1 ? 'member' : 'members'} attending</span>
                          </div>
                        </div>

                        {event.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-4">{event.description}</p>
                        )}

                        <button
                          onClick={() => handleRsvp(event)}
                          disabled={rsvping === event.id}
                          className={cn(
                            'w-full py-2 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2',
                            rsvped
                              ? 'bg-muted text-foreground border border-border hover:bg-muted/80'
                              : 'bg-foreground text-background hover:opacity-85'
                          )}
                        >
                          {rsvping === event.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : rsvped ? (
                            <><CheckCircle2 className="w-4 h-4" /> Attending (Cancel RSVP)</>
                          ) : (
                            <><CalendarDays className="w-4 h-4" /> RSVP to Attend</>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Past Events</h3>
              <div className="space-y-2">
                {past.map((event) => (
                  <div key={event.id} className="flex items-center gap-4 px-4 py-3 bg-card rounded-xl border border-border opacity-60">
                    <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{event.title}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(event.date)} · {event.venue}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-muted-foreground">{(event.rsvps ?? []).length} attended</span>
                      {canManage && (
                        <button
                          onClick={() => handleDelete(event.id)}
                          className="p-1 rounded-md hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 text-muted-foreground transition-colors"
                          title="Delete Event"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Event Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="New Event"
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
              form="event-form"
              disabled={submitting}
              className="w-full sm:w-auto px-6 h-12 rounded-xl text-sm font-medium bg-foreground text-background hover:bg-foreground/90 transition-colors disabled:opacity-70 flex items-center justify-center min-w-[160px]"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Event'}
            </button>
          </>
        }
      >
        <form id="event-form" onSubmit={handleCreate} className="space-y-6">
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Event Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Monthly Chapter Meeting"
              className="w-full px-4 h-12 bg-muted/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground transition-all"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Venue *</label>
            <input
              type="text"
              value={form.venue}
              onChange={e => setForm(f => ({ ...f, venue: e.target.value }))}
              placeholder="e.g. TPAS Community Hall, Nagercoil"
              className="w-full px-4 h-12 bg-muted/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground transition-all"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">Date *</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full px-4 h-12 bg-muted/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground transition-all"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">Time *</label>
              <input
                type="time"
                value={form.time}
                onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                className="w-full px-4 h-12 bg-muted/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground transition-all"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Event description..."
              className="w-full px-4 py-3 min-h-[130px] bg-muted/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground transition-all resize-none"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
