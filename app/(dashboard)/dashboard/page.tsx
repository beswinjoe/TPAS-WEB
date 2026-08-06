'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { formatDate, formatCurrency, getInitials, cn } from '@/lib/utils';
import { ROLE_COLORS } from '@/lib/constants';
import type { Announcement, Event, Donation, Role } from '@/types';
import {
  Users, IndianRupee, CheckCircle2, Clock, CalendarDays,
  Building2, TrendingUp, ArrowRight, Bell, Zap, CreditCard,
  FileText, UserCheck, BadgeCheck
} from 'lucide-react';
import Link from 'next/link';

function StatCard({ label, value, icon: Icon, color, sub }: { label: string; value: string | number; icon: React.ElementType; color: string; sub?: string }) {
  return (
    <div className={`rounded-2xl p-5 text-white shadow-lg card-hover ${color}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white/70 text-xs font-medium uppercase tracking-wide">{label}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          {sub && <p className="text-white/60 text-xs mt-1">{sub}</p>}
        </div>
        <div className="p-2.5 bg-white/15 rounded-xl">
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}

function QuickAction({ label, href, icon: Icon, color }: { label: string; href: string; icon: React.ElementType; color: string }) {
  return (
    <Link href={href} className={`flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-card hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group`}>
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center leading-tight">{label}</span>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl p-5 bg-muted animate-pulse">
      <div className="h-3 w-20 bg-muted-foreground/20 rounded mb-3" />
      <div className="h-8 w-16 bg-muted-foreground/20 rounded" />
    </div>
  );
}

export default function DashboardPage() {
  const { member, role } = useAuth();
  const supabase = createClient();
  const [stats, setStats] = useState({ total: 0, paid: 0, pending: 0, divisions: 5, events: 0 });
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [donationStatus, setDonationStatus] = useState<Donation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (member) loadData();
  }, [member]);

  async function loadData() {
    const [membersRes, donationsRes, announcementsRes, eventsRes, myDonationRes] = await Promise.all([
      supabase.from('members').select('id, status', { count: 'exact' }),
      supabase.from('donations').select('id, status').eq('year', new Date().getFullYear()),
      supabase.from('announcements').select('*').order('date', { ascending: false }).limit(4),
      supabase.from('events').select('*').gte('date', new Date().toISOString().split('T')[0]).order('date').limit(3),
      supabase.from('donations').select('*').eq('member_id', member!.id).eq('year', new Date().getFullYear()).single(),
    ]);

    const total = membersRes.count ?? 0;
    const paid = donationsRes.data?.filter(d => d.status === 'Paid').length ?? 0;
    const pending = donationsRes.data?.filter(d => d.status === 'Pending').length ?? 0;
    const eventsCount = eventsRes.data?.length ?? 0;

    setStats({ total, paid, pending, divisions: 5, events: eventsCount });
    setAnnouncements((announcementsRes.data as Announcement[]) ?? []);
    setEvents((eventsRes.data as Event[]) ?? []);
    setDonationStatus(myDonationRes.data as Donation ?? null);
    setLoading(false);
  }

  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl shadow-lg"
        style={{ background: 'linear-gradient(135deg, #0F2044 0%, #1a3a6c 60%, #0369a1 100%)' }}>
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-6 right-20 w-24 h-24 rounded-full bg-blue-400/10 pointer-events-none" />
        <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-4">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white text-2xl font-bold shrink-0">
            {member?.photo_url
              ? <img src={member.photo_url} alt="" className="w-full h-full rounded-2xl object-cover" />
              : getInitials(member?.name ?? 'U')}
          </div>
          <div className="flex-1">
            <p className="text-blue-200 text-sm font-medium">Welcome back 👋</p>
            <h2 className="text-white text-xl md:text-2xl font-bold mt-0.5">{member?.name}</h2>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-xs bg-white/15 text-white px-2.5 py-1 rounded-full">{member?.employee_id}</span>
              <span className="text-xs bg-blue-500/30 text-blue-100 px-2.5 py-1 rounded-full">{role}</span>
              {member?.division && (
                <span className="text-xs bg-white/10 text-blue-200 px-2.5 py-1 rounded-full">{member.division}</span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 text-right">
            <div className="text-right">
              <p className="text-blue-200 text-xs">Member Since</p>
              <p className="text-white font-semibold text-sm">{formatDate(member?.joining_date)}</p>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
              donationStatus?.status === 'Paid'
                ? 'bg-green-500/20 text-green-300'
                : 'bg-amber-500/20 text-amber-300'
            }`}>
              {donationStatus?.status === 'Paid'
                ? <><CheckCircle2 className="w-3.5 h-3.5" /> {currentYear} Donation Paid</>
                : <><Clock className="w-3.5 h-3.5" /> {currentYear} Donation Pending</>}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {loading ? (
          Array(5).fill(0).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard label="Total Members" value={stats.total} icon={Users} color="bg-gradient-to-br from-blue-600 to-blue-700" />
            <StatCard label="Paid Members" value={stats.paid} icon={CheckCircle2} color="bg-gradient-to-br from-emerald-500 to-emerald-600" sub={`${currentYear}`} />
            <StatCard label="Pending" value={stats.pending} icon={Clock} color="bg-gradient-to-br from-amber-500 to-orange-500" sub={`${currentYear}`} />
            <StatCard label="Divisions" value={stats.divisions} icon={Building2} color="bg-gradient-to-br from-purple-600 to-purple-700" />
            <StatCard label="Events" value={stats.events} icon={CalendarDays} color="bg-gradient-to-br from-rose-500 to-pink-600" sub="Upcoming" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Announcements + Events */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Announcements */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Bell className="w-4.5 h-4.5 text-primary" />
                <h3 className="font-semibold text-foreground">Recent Announcements</h3>
              </div>
              <Link href="/announcements" className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-border">
              {loading ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="px-5 py-4 animate-pulse">
                    <div className="h-3.5 w-48 bg-muted rounded mb-2" />
                    <div className="h-3 w-full bg-muted rounded mb-1" />
                    <div className="h-3 w-3/4 bg-muted rounded" />
                  </div>
                ))
              ) : announcements.length === 0 ? (
                <p className="px-5 py-8 text-center text-muted-foreground text-sm">No announcements yet.</p>
              ) : (
                announcements.map((ann) => (
                  <div key={ann.id} className="px-5 py-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'mt-0.5 w-2 h-2 rounded-full shrink-0',
                        ann.category === 'Important' ? 'bg-red-500' :
                        ann.category === 'Finance' ? 'bg-amber-500' :
                        ann.category === 'Event' ? 'bg-purple-500' :
                        'bg-blue-500'
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-foreground leading-snug truncate">{ann.title}</p>
                          <span className={cn(
                            'shrink-0 text-xs px-2 py-0.5 rounded-full',
                            ann.category === 'Important' ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400' :
                            ann.category === 'Finance' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400' :
                            'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                          )}>
                            {ann.category}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ann.description}</p>
                        <p className="text-xs text-muted-foreground/60 mt-1.5">{formatDate(ann.date)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4.5 h-4.5 text-primary" />
                <h3 className="font-semibold text-foreground">Upcoming Meetings & Events</h3>
              </div>
              <Link href="/events" className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="p-5 grid gap-3">
              {loading ? (
                Array(2).fill(0).map((_, i) => (
                  <div key={i} className="p-4 bg-muted rounded-xl animate-pulse">
                    <div className="h-4 w-48 bg-muted-foreground/20 rounded mb-2" />
                    <div className="h-3 w-32 bg-muted-foreground/20 rounded" />
                  </div>
                ))
              ) : events.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-4">No upcoming events.</p>
              ) : (
                events.map((event) => (
                  <div key={event.id} className="flex items-start gap-4 p-4 bg-muted/40 rounded-xl hover:bg-muted/70 transition-colors border border-border/50">
                    <div className="shrink-0 w-12 h-12 rounded-xl gradient-primary flex flex-col items-center justify-center text-white text-center">
                      <span className="text-xs font-medium leading-tight">{formatDate(event.date).split(' ')[1]}</span>
                      <span className="text-lg font-bold leading-tight">{formatDate(event.date).split(' ')[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{event.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">📍 {event.venue}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">🕐 {event.time}</p>
                    </div>
                    <Link href="/events" className="shrink-0 text-xs text-primary hover:text-primary/80 font-medium">
                      RSVP →
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Profile + Quick Actions */}
        <div className="space-y-5">
          {/* My Details */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <UserCheck className="w-4.5 h-4.5 text-primary" />
              <h3 className="font-semibold text-foreground">My Details</h3>
            </div>
            <div className="p-5 space-y-3">
              {[
                { label: 'Role', value: member?.role ?? '—' },
                { label: 'Division', value: member?.division ?? '—' },
                { label: 'Sub Division', value: member?.sub_division ?? '—' },
                { label: 'Phone', value: member?.phone ?? '—' },
                { label: 'Email', value: member?.email ?? '—' },
                { label: 'Status', value: member?.status ?? '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between gap-2">
                  <span className="text-xs text-muted-foreground shrink-0">{label}</span>
                  <span className={cn('text-xs font-medium text-right truncate max-w-36',
                    label === 'Role' && role ? ROLE_COLORS[role as Role] + ' px-2 py-0.5 rounded-full' : 'text-foreground',
                    label === 'Status' && value === 'Active' ? 'text-green-600' : ''
                  )}>
                    {value}
                  </span>
                </div>
              ))}
              <div className="flex items-start justify-between gap-2 pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground">Last Payment</span>
                <span className="text-xs font-medium text-foreground">
                  {donationStatus?.payment_date ? formatDate(donationStatus.payment_date) : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <Zap className="w-4.5 h-4.5 text-primary" />
              <h3 className="font-semibold text-foreground">Quick Actions</h3>
            </div>
            <div className="p-4 grid grid-cols-3 gap-3">
              <QuickAction label="Pay Donation" href="/donations" icon={IndianRupee} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400" />
              <QuickAction label="My ID Card" href="/digital-id" icon={CreditCard} color="bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400" />
              <QuickAction label="Documents" href="/documents" icon={FileText} color="bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400" />
              <QuickAction label="Members" href="/members" icon={Users} color="bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400" />
              <QuickAction label="Events" href="/events" icon={CalendarDays} color="bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400" />
              <QuickAction label="Promotions" href="/promotions" icon={TrendingUp} color="bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400" />
            </div>
          </div>

          {/* Donation Status Card */}
          <div className={cn(
            'rounded-2xl border p-5',
            donationStatus?.status === 'Paid'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
              : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
          )}>
            <div className="flex items-center gap-2 mb-3">
              <BadgeCheck className={cn('w-5 h-5', donationStatus?.status === 'Paid' ? 'text-emerald-600' : 'text-amber-600')} />
              <h3 className={cn('font-semibold text-sm', donationStatus?.status === 'Paid' ? 'text-emerald-800 dark:text-emerald-300' : 'text-amber-800 dark:text-amber-300')}>
                {currentYear} Donation Status
              </h3>
            </div>
            <p className={cn('text-2xl font-bold', donationStatus?.status === 'Paid' ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400')}>
              {formatCurrency(donationStatus?.amount ?? 500)}
            </p>
            <p className={cn('text-sm mt-1', donationStatus?.status === 'Paid' ? 'text-emerald-600' : 'text-amber-600')}>
              {donationStatus?.status === 'Paid'
                ? `Paid on ${formatDate(donationStatus.payment_date!)}`
                : `Due — Please pay before Dec 31, ${currentYear}`}
            </p>
            {donationStatus?.status !== 'Paid' && (
              <Link href="/donations" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline">
                Pay Now <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
