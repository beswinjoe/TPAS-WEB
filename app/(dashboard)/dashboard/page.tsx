'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { formatDate, formatCurrency, getInitials, cn } from '@/lib/utils';
import { ROLE_COLORS } from '@/lib/constants';
import type { Announcement, Event, Donation, ActivityLog, Role } from '@/types';
import {
  Users, IndianRupee, CheckCircle2, Clock, CalendarDays,
  Building2, TrendingUp, ArrowRight, Bell, Zap, CreditCard,
  FileText, UserCheck, BadgeCheck, MapPin, Activity, Award
} from 'lucide-react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

const CHART_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

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

const ACTION_ICONS: Record<string, React.ElementType> = {
  LOGIN: UserCheck,
  LOGOUT: UserCheck,
  ADD_MEMBER: Users,
  RESET_PASSWORD: CreditCard,
  DELETE_MEMBER: Users,
  UPDATE_MEMBER: Users,
  PAY_DONATION: IndianRupee,
  PROMOTION: TrendingUp,
};

const ACTION_COLORS: Record<string, string> = {
  LOGIN: 'text-blue-500 bg-blue-50 dark:bg-blue-950',
  LOGOUT: 'text-gray-500 bg-gray-50 dark:bg-gray-950',
  ADD_MEMBER: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950',
  RESET_PASSWORD: 'text-amber-500 bg-amber-50 dark:bg-amber-950',
  DELETE_MEMBER: 'text-red-500 bg-red-50 dark:bg-red-950',
  UPDATE_MEMBER: 'text-purple-500 bg-purple-50 dark:bg-purple-950',
  PAY_DONATION: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950',
  PROMOTION: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950',
};

export default function DashboardPage() {
  const { member, role } = useAuth();
  const supabase = createClient();
  const [stats, setStats] = useState({
    total: 0, paid: 0, pending: 0, divisions: 0, subDivisions: 0,
    events: 0, totalCollected: 0, pendingAmount: 0, promotionsThisYear: 0,
  });
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [donationStatus, setDonationStatus] = useState<Donation | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  const [donationTrend, setDonationTrend] = useState<{ year: number; collected: number; pending: number }[]>([]);
  const [divisionChart, setDivisionChart] = useState<{ name: string; members: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (member) loadData();
  }, [member]);

  async function loadData() {
    const currentYear = new Date().getFullYear();
    const [
      membersRes, donationsRes, announcementsRes, eventsRes, myDonationRes,
      divisionsRes, promotionsRes, activityRes, allDonationsRes,
    ] = await Promise.all([
      supabase.from('members').select('id, status, division', { count: 'exact' }),
      supabase.from('donations').select('id, status, amount').eq('year', currentYear),
      supabase.from('announcements').select('*').order('date', { ascending: false }).limit(4),
      supabase.from('events').select('*').gte('date', new Date().toISOString().split('T')[0]).order('date').limit(3),
      supabase.from('donations').select('*').eq('member_id', member!.id).eq('year', currentYear).single(),
      supabase.from('divisions').select('name, sub_divisions'),
      supabase.from('promotions').select('id').gte('promotion_date', `${currentYear}-01-01`),
      supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(10),
      supabase.from('donations').select('year, status, amount'),
    ]);

    const total = membersRes.count ?? 0;
    const paid = donationsRes.data?.filter(d => d.status === 'Paid').length ?? 0;
    const pending = donationsRes.data?.filter(d => d.status === 'Pending').length ?? 0;
    const eventsCount = eventsRes.data?.length ?? 0;

    // Division stats
    const divData = divisionsRes.data ?? [];
    const totalDivisions = divData.length;
    const totalSubDivisions = divData.reduce((acc, d) => acc + ((d.sub_divisions as string[])?.length ?? 0), 0);

    // Donation amounts
    const totalCollected = donationsRes.data
      ?.filter(d => d.status === 'Paid')
      .reduce((sum, d) => sum + Number(d.amount), 0) ?? 0;
    const pendingAmount = donationsRes.data
      ?.filter(d => d.status === 'Pending')
      .reduce((sum, d) => sum + Number(d.amount), 0) ?? 0;

    // Promotions this year
    const promotionsThisYear = promotionsRes.data?.length ?? 0;

    setStats({ total, paid, pending, divisions: totalDivisions, subDivisions: totalSubDivisions, events: eventsCount, totalCollected, pendingAmount, promotionsThisYear });
    setAnnouncements((announcementsRes.data as Announcement[]) ?? []);
    setEvents((eventsRes.data as Event[]) ?? []);
    setDonationStatus(myDonationRes.data as Donation ?? null);
    setRecentActivity((activityRes.data as ActivityLog[]) ?? []);

    // Donation trend by year
    const yearMap: Record<number, { collected: number; pending: number }> = {};
    for (const d of (allDonationsRes.data ?? [])) {
      if (!yearMap[d.year]) yearMap[d.year] = { collected: 0, pending: 0 };
      if (d.status === 'Paid') yearMap[d.year].collected += Number(d.amount);
      else yearMap[d.year].pending += Number(d.amount);
    }
    setDonationTrend(
      Object.entries(yearMap)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([year, v]) => ({ year: Number(year), ...v }))
    );

    // Division member distribution
    const divMemberMap: Record<string, number> = {};
    for (const m of (membersRes.data ?? [])) {
      if (m.division) divMemberMap[m.division] = (divMemberMap[m.division] ?? 0) + 1;
    }
    setDivisionChart(Object.entries(divMemberMap).map(([name, members]) => ({ name: name.replace(' Division', ''), members })));

    setLoading(false);
  }

  const currentYear = new Date().getFullYear();

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return formatDate(dateStr);
  }

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

      {/* Stats Row — expanded */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {loading ? (
          Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard label="Total Members" value={stats.total} icon={Users} color="bg-gradient-to-br from-blue-600 to-blue-700" />
            <StatCard label="Paid Members" value={stats.paid} icon={CheckCircle2} color="bg-gradient-to-br from-emerald-500 to-emerald-600" sub={`${currentYear}`} />
            <StatCard label="Pending" value={stats.pending} icon={Clock} color="bg-gradient-to-br from-amber-500 to-orange-500" sub={`${currentYear}`} />
            <StatCard label="Divisions" value={stats.divisions} icon={Building2} color="bg-gradient-to-br from-purple-600 to-purple-700" sub={`${stats.subDivisions} sub-divisions`} />
            <StatCard label="Collected" value={formatCurrency(stats.totalCollected)} icon={IndianRupee} color="bg-gradient-to-br from-teal-500 to-teal-600" sub={`${currentYear}`} />
            <StatCard label="Pending Amount" value={formatCurrency(stats.pendingAmount)} icon={IndianRupee} color="bg-gradient-to-br from-red-500 to-red-600" sub={`${currentYear}`} />
            <StatCard label="Promotions" value={stats.promotionsThisYear} icon={Award} color="bg-gradient-to-br from-indigo-500 to-indigo-600" sub={`${currentYear}`} />
            <StatCard label="Events" value={stats.events} icon={CalendarDays} color="bg-gradient-to-br from-rose-500 to-pink-600" sub="Upcoming" />
          </>
        )}
      </div>

      {/* Charts Row */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Donation Trend */}
          {donationTrend.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4.5 h-4.5 text-primary" />
                <h3 className="font-semibold text-foreground text-sm">Donation Collection Trend</h3>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={donationTrend} barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v / 1000}k`} />
                  <Tooltip formatter={(v) => [formatCurrency(Number(v)), '']} />
                  <Legend iconType="circle" iconSize={8} />
                  <Bar dataKey="collected" name="Collected" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pending" name="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Division Distribution */}
          {divisionChart.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-5">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-4.5 h-4.5 text-primary" />
                <h3 className="font-semibold text-foreground text-sm">Members by Division</h3>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={divisionChart} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="members" paddingAngle={3} label={(props: any) => `${props.name ?? ''}: ${props.value ?? ''}`}>
                    {divisionChart.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Announcements + Events */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Activity Feed */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Activity className="w-4.5 h-4.5 text-primary" />
                <h3 className="font-semibold text-foreground">Recent Activity</h3>
              </div>
            </div>
            <div className="divide-y divide-border max-h-72 overflow-y-auto scrollbar-thin">
              {loading ? (
                Array(4).fill(0).map((_, i) => (
                  <div key={i} className="px-5 py-3 animate-pulse flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted" />
                    <div className="flex-1">
                      <div className="h-3 w-48 bg-muted rounded mb-1.5" />
                      <div className="h-2.5 w-20 bg-muted rounded" />
                    </div>
                  </div>
                ))
              ) : recentActivity.length === 0 ? (
                <p className="px-5 py-8 text-center text-muted-foreground text-sm">No recent activity.</p>
              ) : (
                recentActivity.map((log) => {
                  const Icon = ACTION_ICONS[log.action] ?? Activity;
                  const colorClass = ACTION_COLORS[log.action] ?? 'text-gray-500 bg-gray-50 dark:bg-gray-950';
                  return (
                    <div key={log.id} className="px-5 py-3 hover:bg-muted/30 transition-colors flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{log.details}</p>
                        <p className="text-xs text-muted-foreground/60">{timeAgo(log.created_at)}</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">{log.action.replace('_', ' ')}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

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
