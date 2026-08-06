'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import type { Event, Role } from '@/types';
import { formatDate, cn } from '@/lib/utils';
import { CAN_MANAGE_EVENTS } from '@/lib/constants';
import { CalendarDays, MapPin, Clock, Users, CheckCircle2, Plus, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function EventsPage() {
  const { member, role } = useAuth();
  const supabase = createClient();
  const canManage = role && CAN_MANAGE_EVENTS.includes(role as Role);

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [rsvping, setRsvping] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: '', venue: '', description: '', date: '', time: '' });

  useEffect(() => { loadEvents(); }, []);

  async function loadEvents() {
    const { data } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: true });
    setEvents((data as Event[]) ?? []);
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

    const { error } = await supabase
      .from('events')
      .update({ rsvps: newRsvps })
      .eq('id', event.id);

    if (error) {
      toast.error('Failed to update RSVP.');
    } else {
      toast.success(already ? 'RSVP cancelled.' : 'RSVP confirmed! 🎉');
      setEvents(evs => evs.map(e => e.id === event.id ? { ...e, rsvps: newRsvps } : e));
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
    const { error } = await supabase.from('events').insert({ ...form, rsvps: [] });
    if (error) {
      toast.error('Failed to create event.');
    } else {
      toast.success('Event created!');
      setShowForm(false);
      setForm({ title: '', venue: '', description: '', date: '', time: '' });
      loadEvents();
    }
    setSubmitting(false);
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
            className="flex items-center gap-2 px-4 py-2.5 gradient-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-md shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            Add Event
          </button>
        )}
      </div>

      {/* Upcoming Events */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-5 animate-pulse">
              <div className="h-5 w-3/4 bg-muted rounded mb-3" />
              <div className="h-4 w-1/2 bg-muted rounded mb-2" />
              <div className="h-4 w-full bg-muted rounded" />
            </div>
          ))}
        </div>
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
                      <div className="h-1.5 gradient-primary" />
                      <div className="p-5">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="shrink-0 w-12 h-12 rounded-xl gradient-primary flex flex-col items-center justify-center text-white text-center shadow-md">
                            <span className="text-xs font-medium leading-none">{formatDate(event.date).split(' ')[1]}</span>
                            <span className="text-lg font-bold leading-none">{formatDate(event.date).split(' ')[0]}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-foreground text-sm leading-snug">{event.title}</h3>
                            {rsvped && (
                              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium mt-0.5">
                                <CheckCircle2 className="w-3 h-3" /> RSVP'd
                              </span>
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
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-950 dark:hover:text-red-400'
                              : 'gradient-primary text-white hover:opacity-90 shadow-md shadow-primary/20'
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
                    <span className="text-xs text-muted-foreground shrink-0">{(event.rsvps ?? []).length} attended</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Event Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowForm(false)}>
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground">New Event</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              {[
                { label: 'Event Title *', key: 'title', type: 'text', placeholder: 'e.g. Monthly Chapter Meeting' },
                { label: 'Venue *', key: 'venue', type: 'text', placeholder: 'e.g. TPAS Community Hall, Nagercoil' },
                { label: 'Date *', key: 'date', type: 'date', placeholder: '' },
                { label: 'Time *', key: 'time', type: 'time', placeholder: '' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="text-sm font-medium text-foreground block mb-1.5">{label}</label>
                  <input
                    type={type}
                    value={form[key as keyof typeof form]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
              ))}
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Event description..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2.5 gradient-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-70">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
