'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatDate, cn } from '@/lib/utils';
import type { Announcement, Event } from '@/types';
import {
  Users, IndianRupee, Building2, CalendarDays, CheckCircle2,
  ArrowRight, MapPin, Clock, LogIn, Star, Shield, Heart
} from 'lucide-react';

export default function HomePage() {
  const supabase = createClient();
  const [stats, setStats] = useState({ members: 0, paid: 0, pending: 0, divisions: 5, events: 0 });
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [membersRes, donationsRes, annsRes, eventsRes] = await Promise.all([
        supabase.from('members').select('id', { count: 'exact' }),
        supabase.from('donations').select('status').eq('year', new Date().getFullYear()),
        supabase.from('announcements').select('*').order('date', { ascending: false }).limit(3),
        supabase.from('events').select('*').gte('date', new Date().toISOString().split('T')[0]).order('date').limit(3),
      ]);
      const paid = donationsRes.data?.filter(d => d.status === 'Paid').length ?? 0;
      const pending = donationsRes.data?.filter(d => d.status === 'Pending').length ?? 0;
      setStats({ members: membersRes.count ?? 0, paid, pending, divisions: 5, events: eventsRes.data?.length ?? 0 });
      setAnnouncements((annsRes.data as Announcement[]) ?? []);
      setEvents((eventsRes.data as Event[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-background/90 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/images/logo.jpg" alt="TPAS Logo" width={36} height={36} className="rounded-lg" />
            <div>
              <p className="font-bold text-foreground text-sm leading-tight">TPAS Kanniyakumari</p>
              <p className="text-muted-foreground text-xs">Member Portal</p>
            </div>
          </div>
          <Link
            href="/login"
            className="flex items-center gap-2 px-4 py-2 gradient-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-md shadow-primary/20"
          >
            <LogIn className="w-4 h-4" />
            Member Login
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden py-20 md:py-28 px-4"
        style={{ background: 'linear-gradient(135deg, #0F2044 0%, #1a3a6c 50%, #0369a1 100%)' }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 right-10 w-64 h-64 rounded-full bg-white/5" />
          <div className="absolute -bottom-20 left-0 w-80 h-80 rounded-full bg-blue-500/10" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white/3" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-white/10 rounded-3xl border border-white/20 backdrop-blur-sm shadow-2xl">
              <Image src="/images/logo.jpg" alt="TPAS Logo" width={72} height={72} className="rounded-2xl" />
            </div>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
            TPAS Kanniyakumari
          </h1>
          <p className="text-blue-200 text-lg md:text-xl mb-6 font-medium">
            Tamil Nadu Postal Accounts Service Association
          </p>
          <p className="text-blue-100/80 text-base max-w-2xl mx-auto leading-relaxed mb-8">
            Serving and empowering postal accounts service employees in Kanniyakumari district 
            through unity, professional development, and community welfare.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/login" className="flex items-center gap-2 px-6 py-3 bg-white text-blue-900 rounded-xl font-bold hover:shadow-xl transition-all">
              <LogIn className="w-4 h-4" />
              Access Member Portal
            </Link>
            <a href="#about" className="flex items-center gap-2 px-6 py-3 bg-white/10 text-white border border-white/20 rounded-xl font-semibold hover:bg-white/20 transition-all backdrop-blur-sm">
              Learn More <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-4 bg-card border-b border-border">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total Members', value: stats.members, icon: Users, color: 'text-blue-600' },
            { label: 'Paid Members', value: stats.paid, icon: CheckCircle2, color: 'text-emerald-600' },
            { label: 'Pending', value: stats.pending, icon: IndianRupee, color: 'text-amber-600' },
            { label: 'Divisions', value: stats.divisions, icon: Building2, color: 'text-purple-600' },
            { label: 'Events', value: stats.events, icon: CalendarDays, color: 'text-rose-600' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="text-center p-4">
              <Icon className={cn('w-8 h-8 mx-auto mb-2', color)} />
              <p className="text-2xl md:text-3xl font-bold text-foreground">{loading ? '—' : value}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mission, Vision, About */}
      <section id="about" className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">About TPAS Kanniyakumari</h2>
            <p className="text-muted-foreground mt-2 max-w-xl mx-auto">Our organization&apos;s foundation, purpose, and commitment</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {[
              {
                icon: Star,
                title: 'Our Mission',
                color: 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
                content: 'To protect and promote the interests of Tamil Nadu Postal Accounts Service employees in Kanniyakumari district, ensuring their welfare, professional growth, and unity through collective strength and mutual support.',
              },
              {
                icon: Shield,
                title: 'Our Vision',
                color: 'bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400',
                content: 'To be the most trusted and effective association for postal accounts service employees, creating a workplace where every member is valued, respected, and has equal opportunities for growth and advancement.',
              },
              {
                icon: Heart,
                title: 'Our Values',
                color: 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400',
                content: 'Unity, transparency, integrity, and service to our members and community. We believe in collective action, democratic processes, and the power of an organized and united workforce.',
              },
            ].map(({ icon: Icon, title, color, content }) => (
              <div key={title} className="bg-card rounded-2xl border border-border p-6 card-hover">
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-4', color)}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-foreground text-lg mb-3">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{content}</p>
              </div>
            ))}
          </div>

          {/* About TPAS */}
          <div className="bg-card rounded-2xl border border-border p-8 text-center">
            <div className="flex justify-center mb-4">
              <Image src="/images/logo.jpg" alt="TPAS Logo" width={56} height={56} className="rounded-xl" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-4">About TPAS Kanniyakumari</h3>
            <p className="text-muted-foreground leading-relaxed max-w-3xl mx-auto">
              The Tamil Nadu Postal Accounts Service Association (TPAS), Kanniyakumari Chapter, has been 
              serving the postal accounts service community since 2020. We represent employees across 
              5 divisions in Kanniyakumari district, working tirelessly to advance their professional 
              and personal interests. Our activities include annual gatherings, welfare programs, 
              professional development workshops, and community service initiatives. We maintain 
              transparent governance with elected representatives and annual general meetings.
            </p>
          </div>
        </div>
      </section>

      {/* Announcements */}
      {announcements.length > 0 && (
        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-8 text-center">Latest Announcements</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {announcements.map((ann) => (
                <div key={ann.id} className="bg-card rounded-2xl border border-border p-5 card-hover">
                  <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full',
                    ann.category === 'Important' ? 'bg-red-100 text-red-700' :
                    ann.category === 'Finance' ? 'bg-amber-100 text-amber-700' :
                    'bg-blue-100 text-blue-700'
                  )}>
                    {ann.category}
                  </span>
                  <h3 className="font-semibold text-foreground mt-3 mb-2">{ann.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-3">{ann.description}</p>
                  <p className="text-xs text-muted-foreground/70 mt-3">{formatDate(ann.date)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Events */}
      {events.length > 0 && (
        <section className="py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-8 text-center">Upcoming Events</h2>
            <div className="space-y-4">
              {events.map((event) => (
                <div key={event.id} className="bg-card rounded-2xl border border-border p-5 flex items-start gap-4 card-hover">
                  <div className="shrink-0 w-14 h-14 rounded-xl gradient-primary flex flex-col items-center justify-center text-white shadow-md">
                    <span className="text-xs font-medium">{formatDate(event.date).split(' ')[1]}</span>
                    <span className="text-xl font-bold leading-tight">{formatDate(event.date).split(' ')[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground">{event.title}</h3>
                    <div className="flex flex-wrap gap-3 mt-2">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" /> {event.venue}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" /> {event.time}
                      </span>
                    </div>
                    {event.description && <p className="text-sm text-muted-foreground mt-1.5 line-clamp-1">{event.description}</p>}
                  </div>
                  <Link href="/login" className="shrink-0 text-xs font-semibold text-primary hover:text-primary/80">
                    Login to RSVP →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-16 px-4"
        style={{ background: 'linear-gradient(135deg, #0F2044 0%, #1a3a6c 100%)' }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Ready to access your member portal?</h2>
          <p className="text-blue-200 mb-8">Login with your Employee ID to access your dashboard, donations, events, and more.</p>
          <Link href="/login" className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-blue-900 rounded-xl font-bold hover:shadow-xl transition-all text-base">
            <LogIn className="w-5 h-5" />
            Login to Member Portal
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-card border-t border-border">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src="/images/logo.jpg" alt="TPAS Logo" width={32} height={32} className="rounded-lg" />
            <div>
              <p className="font-semibold text-foreground text-sm">TPAS Kanniyakumari</p>
              <p className="text-muted-foreground text-xs">Member Portal</p>
            </div>
          </div>
          <p className="text-muted-foreground text-sm">© {new Date().getFullYear()} TPAS Kanniyakumari. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
