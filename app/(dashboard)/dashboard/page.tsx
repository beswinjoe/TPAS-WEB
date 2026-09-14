'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase/client';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, query, orderBy, limit, addDoc, getDoc, getCountFromServer, where } from 'firebase/firestore';
import { formatDate, formatCurrency, getInitials, cn } from '@/lib/utils';
import type { Announcement, Event, Donation, ActivityLog } from '@/types';
import { DONATION_STATUS } from '@/lib/constants';
import {
  Users, IndianRupee, CheckCircle2, Clock, CalendarDays,
  Building2, TrendingUp, ArrowRight, Bell, Zap, CreditCard,
  FileText, UserCheck, BadgeCheck, MapPin, Activity, Award,
  UserPlus, Shield, Megaphone
} from 'lucide-react';
import Link from 'next/link';
import { useCountUp } from '@/lib/hooks';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { CardSkeleton, ListSkeleton } from '@/components/ui/skeletons';
import { EmptyState } from '@/components/ui/empty-state';

const CHART_COLORS = ['#171717', '#525252', '#a3a3a3', '#d4d4d4', '#737373', '#404040'];

function StatCard({ label, value, icon: Icon, sub, isCurrency, loading }: { label: string; value: number; icon: React.ElementType; sub?: string; isCurrency?: boolean; loading?: boolean }) {
  const animatedValue = useCountUp(value, 1200);

  if (loading) return <CardSkeleton />;

  return (
    <div className="rounded-xl p-5 bg-card border border-border card-hover">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold mt-1.5 text-foreground">
            {isCurrency ? formatCurrency(animatedValue) : animatedValue}
          </p>
          {sub && <p className="text-muted-foreground/60 text-xs mt-1">{sub}</p>}
        </div>
        <div className="p-2 bg-muted rounded-lg">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

function QuickAction({ label, href, icon: Icon }: { label: string; href: string; icon: React.ElementType }) {
  return (
    <Link href={href} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-all duration-150 group">
      <div className="p-2.5 rounded-lg bg-muted">
        <Icon className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
      <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center leading-tight">{label}</span>
    </Link>
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

export default function DashboardPage() {
  const { member, role } = useAuth();
  const currentYear = new Date().getFullYear();

  // Progressive loading states
  const [stats, setStats] = useState({ total: 0, paid: 0, pending: 0, divisions: 0, subDivisions: 0, events: 0, totalCollected: 0, pendingAmount: 0, promotionsThisYear: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);

  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  const [donationStatus, setDonationStatus] = useState<Donation | null>(null);
  
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  const [donationTrend, setDonationTrend] = useState<{ year: number; collected: number; pending: number }[]>([]);
  const [divisionChart, setDivisionChart] = useState<{ name: string; members: number }[]>([]);
  const [chartsLoading, setChartsLoading] = useState(true);

  const [lastLogin, setLastLogin] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    if (!member) return;
    setStatsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const startOfYear = `${currentYear}-01-01`;

      let total = 0, paid = 0, pending = 0, totalCollected = 0, pendingAmount = 0;
      let eventsCount = 0, totalDivisions = 0, totalSubDivisions = 0, promotionsThisYear = 0;

      if (role === 'Admin') {
        const [membersRes, donationsRes, eventsRes, divisionsRes, promotionsRes] = await Promise.allSettled([
          getCountFromServer(collection(db, 'members')),
          getDocs(query(collection(db, 'donations'), where('year', '==', currentYear))),
          getCountFromServer(query(collection(db, 'events'), where('date', '>=', today))),
          getDocs(collection(db, 'divisions')),
          getCountFromServer(query(collection(db, 'promotions'), where('promotion_date', '>=', startOfYear))),
        ]);

        total = membersRes.status === 'fulfilled' ? membersRes.value.data().count : 0;
        const donations = donationsRes.status === 'fulfilled' ? donationsRes.value.docs.map(d => d.data()) : [];
        paid = donations.filter(d => d.status === DONATION_STATUS.PAID).length;
        pending = donations.filter(d => d.status === DONATION_STATUS.PENDING).length;
        totalCollected = donations.filter(d => d.status === DONATION_STATUS.PAID).reduce((s, d) => s + Number(d.amount), 0);
        pendingAmount = donations.filter(d => d.status === DONATION_STATUS.PENDING || d.status === DONATION_STATUS.OVERDUE).reduce((s, d) => s + Number(d.amount), 0);
        
        eventsCount = eventsRes.status === 'fulfilled' ? eventsRes.value.data().count : 0;
        const divisionsData = divisionsRes.status === 'fulfilled' ? divisionsRes.value.docs.map(d => d.data()) : [];
        totalDivisions = divisionsData.length;
        totalSubDivisions = divisionsData.reduce((acc, d) => acc + ((d.sub_divisions as string[])?.length ?? 0), 0);
        promotionsThisYear = promotionsRes.status === 'fulfilled' ? promotionsRes.value.data().count : 0;
      } else {
        const [donationsRes, eventsRes, divisionsRes, promotionsRes] = await Promise.allSettled([
          getDocs(query(collection(db, 'donations'), where('member_id', '==', member.id), where('year', '==', currentYear))),
          getCountFromServer(query(collection(db, 'events'), where('date', '>=', today))),
          getDocs(collection(db, 'divisions')),
          getCountFromServer(query(collection(db, 'promotions'), where('member_id', '==', member.id), where('promotion_date', '>=', startOfYear))),
        ]);
        
        total = 1; // Self
        const donations = donationsRes.status === 'fulfilled' ? donationsRes.value.docs.map(d => d.data()) : [];
        paid = donations.filter(d => d.status === DONATION_STATUS.PAID).length;
        pending = donations.filter(d => d.status === DONATION_STATUS.PENDING).length;
        totalCollected = donations.filter(d => d.status === DONATION_STATUS.PAID).reduce((s, d) => s + Number(d.amount), 0);
        pendingAmount = donations.filter(d => d.status === DONATION_STATUS.PENDING || d.status === DONATION_STATUS.OVERDUE).reduce((s, d) => s + Number(d.amount), 0);
        
        eventsCount = eventsRes.status === 'fulfilled' ? eventsRes.value.data().count : 0;
        const divisionsData = divisionsRes.status === 'fulfilled' ? divisionsRes.value.docs.map(d => d.data()) : [];
        totalDivisions = divisionsData.length;
        totalSubDivisions = divisionsData.reduce((acc, d) => acc + ((d.sub_divisions as string[])?.length ?? 0), 0);
        promotionsThisYear = promotionsRes.status === 'fulfilled' ? promotionsRes.value.data().count : 0;
      }

      setStats({ total, paid, pending, divisions: totalDivisions, subDivisions: totalSubDivisions, events: eventsCount, totalCollected, pendingAmount, promotionsThisYear });
    } catch (e) {
      console.error(e);
    } finally {
      setStatsLoading(false);
    }
  }, [currentYear, member, role]);

  const loadAnnouncements = useCallback(async () => {
    setAnnouncementsLoading(true);
    const snap = await getDocs(query(collection(db, 'announcements'), orderBy('date', 'desc'), limit(3)));
    setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Announcement[]);
    setAnnouncementsLoading(false);
  }, []);

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const snap = await getDocs(query(collection(db, 'events'), where('date', '>=', today), orderBy('date', 'asc'), limit(2)));
    setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Event[]);
    setEventsLoading(false);
  }, []);

  const loadActivityAndLogin = useCallback(async () => {
    setActivityLoading(true);
    const [activityRes, loginRes] = await Promise.allSettled([
      getDocs(query(collection(db, 'activity_logs'), orderBy('created_at', 'desc'), limit(10))),
      getDocs(query(collection(db, 'activity_logs'), where('member_id', '==', member!.id), where('action', '==', 'LOGIN'), orderBy('created_at', 'desc'), limit(2)))
    ]);
    
    if (activityRes.status === 'fulfilled') {
      setRecentActivity(activityRes.value.docs.map(d => ({ id: d.id, ...d.data() })) as ActivityLog[]);
    }
    if (loginRes.status === 'fulfilled') {
      const logs = loginRes.value.docs.map(d => d.data() as ActivityLog);
      if (logs.length > 1) setLastLogin(logs[1].created_at);
      else if (logs.length === 1) setLastLogin(logs[0].created_at);
    }
    setActivityLoading(false);
  }, [member]);

  const loadCharts = useCallback(async () => {
    setChartsLoading(true);
    const [donationsRes, membersRes] = await Promise.allSettled([
      getDocs(collection(db, 'donations')),
      getDocs(collection(db, 'members'))
    ]);

    if (donationsRes.status === 'fulfilled') {
      const yearMap: Record<number, { collected: number; pending: number }> = {};
      for (const doc of donationsRes.value.docs) {
        const d = doc.data() as Donation;
        if (!yearMap[d.year]) yearMap[d.year] = { collected: 0, pending: 0 };
        if (d.status === DONATION_STATUS.PAID) yearMap[d.year].collected += Number(d.amount);
        else yearMap[d.year].pending += Number(d.amount);
      }
      setDonationTrend(Object.entries(yearMap).sort(([a], [b]) => Number(a) - Number(b)).map(([year, v]) => ({ year: Number(year), ...v })));
    }

    if (membersRes.status === 'fulfilled') {
      const divMemberMap: Record<string, number> = {};
      for (const doc of membersRes.value.docs) {
        const m = doc.data() as any;
        if (m.division) divMemberMap[m.division] = (divMemberMap[m.division] ?? 0) + 1;
      }
      setDivisionChart(Object.entries(divMemberMap).map(([name, members]) => ({ name: name.replace(' Division', ''), members })));
    }
    setChartsLoading(false);
  }, []);

  const loadMyDonation = useCallback(async () => {
    const snap = await getDocs(query(collection(db, 'donations'), where('member_id', '==', member!.id), where('year', '==', currentYear), limit(1)));
    if (!snap.empty) {
      setDonationStatus(snap.docs[0].data() as Donation);
    } else {
      setDonationStatus(null);
    }
  }, [member, currentYear]);

  useEffect(() => {
    if (!member) return;

    // Fire core requests immediately
    loadStats();
    loadMyDonation();
    if (role === 'Admin') loadCharts();

    // Delay secondary requests to prioritize network bandwidth for stats and layout
    const timer = setTimeout(() => {
      loadAnnouncements();
      loadEvents();
      loadActivityAndLogin();
    }, 400);

    return () => clearTimeout(timer);
  }, [member, loadAnnouncements, loadEvents, loadActivityAndLogin, loadCharts, loadMyDonation, loadStats]);

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
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-muted border border-border flex items-center justify-center text-foreground text-lg font-bold shrink-0">
            {member?.photo_url
              ? <img src={member.photo_url} alt="" className="w-full h-full rounded-xl object-cover" />
              : getInitials(member?.name ?? 'U')}
          </div>
          <div className="flex-1">
            <p className="text-muted-foreground text-xs font-medium">Welcome back</p>
            <h2 className="text-foreground text-lg md:text-xl font-semibold mt-0.5">{member?.name}</h2>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-md border border-border">{member?.employee_id}</span>
              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-md border border-border">{role}</span>
              {member?.division && (
                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-md border border-border">{member.division}</span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 md:items-end">
            <div className="md:text-right">
              <p className="text-muted-foreground text-xs">Last login</p>
              <p className="text-foreground font-medium text-sm">{lastLogin ? formatDate(lastLogin) : 'First login'}</p>
            </div>
            <div className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border',
              donationStatus?.status === DONATION_STATUS.PAID
                ? 'bg-muted text-foreground border-border'
                : 'bg-muted text-muted-foreground border-border'
            )}>
              {donationStatus?.status === DONATION_STATUS.PAID
                ? <><CheckCircle2 className="w-3.5 h-3.5" /> {currentYear} Paid</>
                : <><Clock className="w-3.5 h-3.5" /> {currentYear} Pending</>}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard loading={statsLoading} label="Total Members" value={stats.total} icon={Users} />
        <StatCard loading={statsLoading} label="Paid Members" value={stats.paid} icon={CheckCircle2} sub={`${currentYear}`} />
        <StatCard loading={statsLoading} label="Pending" value={stats.pending} icon={Clock} sub={`${currentYear}`} />
        <StatCard loading={statsLoading} label="Divisions" value={stats.divisions} icon={Building2} sub={`${stats.subDivisions} sub-divisions`} />
        <StatCard loading={statsLoading} label="Collected" value={stats.totalCollected} isCurrency icon={IndianRupee} sub={`${currentYear}`} />
        <StatCard loading={statsLoading} label="Pending Amt" value={stats.pendingAmount} isCurrency icon={IndianRupee} sub={`${currentYear}`} />
        <StatCard loading={statsLoading} label="Promotions" value={stats.promotionsThisYear} icon={Award} sub={`${currentYear}`} />
        <StatCard loading={statsLoading} label="Events" value={stats.events} icon={CalendarDays} sub="Upcoming" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-foreground text-sm">Donation Trend</h3>
          </div>
          {chartsLoading ? (
            <div className="h-[240px] flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>
          ) : donationTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={donationTrend} barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `₹${v / 1000}k`} />
                <Tooltip 
                  formatter={(v) => [formatCurrency(Number(v)), '']} 
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend iconType="circle" iconSize={8} />
                <Bar dataKey="collected" name="Collected" fill="#171717" radius={[3, 3, 0, 0]} />
                <Bar dataKey="pending" name="Pending" fill="#a3a3a3" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={TrendingUp} title="No donation data" description="Trends will appear here." className="py-8" />
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-foreground text-sm">Members by Division</h3>
          </div>
          {chartsLoading ? (
            <div className="h-[240px] flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div>
          ) : divisionChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie 
                  data={divisionChart} 
                  cx="50%" cy="50%" innerRadius={50} outerRadius={65} dataKey="members" paddingAngle={3}
                  labelLine={{ stroke: 'currentColor', strokeWidth: 1, opacity: 0.2 }}
                  label={(props: any) => {
                    const { x, y, name, value, textAnchor } = props;
                    return (
                      <text x={x} y={y} fill="hsl(var(--muted-foreground))" fontSize={9} textAnchor={textAnchor} dominantBaseline="central" className="font-medium">
                        {name}: {value}
                      </text>
                    );
                  }}
                >
                  {divisionChart.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))', borderRadius: '8px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
             <EmptyState icon={MapPin} title="No division data" description="Division breakdown will appear here." className="py-8" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Activity */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold text-foreground text-sm">Recent Activity</h3>
            </div>
            <div className="p-5 max-h-[320px] overflow-y-auto scrollbar-thin">
              {activityLoading ? (
                <ListSkeleton items={4} />
              ) : recentActivity.length === 0 ? (
                <EmptyState icon={Activity} title="No recent activity" description="Activities will appear here once members interact." className="py-6" />
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((log) => {
                    const Icon = ACTION_ICONS[log.action] ?? Activity;
                    return (
                      <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground leading-snug">{log.details}</p>
                          <p className="text-xs text-muted-foreground mt-1">{timeAgo(log.created_at)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Announcements */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold text-foreground text-sm">Announcements</h3>
              </div>
              <Link href="/announcements" className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1 transition-colors">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-border">
              {announcementsLoading ? (
                <ListSkeleton items={3} />
              ) : announcements.length === 0 ? (
                 <EmptyState icon={Megaphone} title="No announcements yet" description="Important updates will appear here." className="py-8" />
              ) : (
                announcements.map((ann) => (
                  <div key={ann.id} className="px-5 py-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-foreground leading-snug truncate">{ann.title}</p>
                          <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-medium border border-border">
                            {ann.category}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ann.description}</p>
                        <p className="text-xs text-muted-foreground/50 mt-1.5">{formatDate(ann.date)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Events */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold text-foreground text-sm">Upcoming Events</h3>
              </div>
              <Link href="/events" className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1 transition-colors">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="p-5 grid gap-3">
              {eventsLoading ? (
                <ListSkeleton items={2} />
              ) : events.length === 0 ? (
                <EmptyState icon={CalendarDays} title="No upcoming events" description="Check back later for new schedules." className="py-6" />
              ) : (
                events.map((event) => (
                  <div key={event.id} className="flex items-start gap-4 p-4 bg-muted/40 rounded-xl hover:bg-muted/70 transition-colors border border-border/50">
                    <div className="shrink-0 w-11 h-11 rounded-lg bg-foreground flex flex-col items-center justify-center text-background text-center">
                      <span className="text-[10px] font-medium leading-tight">{formatDate(event.date).split(' ')[1]}</span>
                      <span className="text-base font-bold leading-tight">{formatDate(event.date).split(' ')[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{event.title}</p>
                      <div className="flex flex-wrap gap-3 mt-1">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" /> {event.venue}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" /> {event.time}
                        </span>
                      </div>
                    </div>
                    <Link href="/events" className="shrink-0 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors">
                      RSVP →
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-5">
          {/* My Details */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold text-foreground text-sm">My Details</h3>
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
                    label === 'Role' ? 'bg-muted px-2 py-0.5 rounded-md border border-border text-muted-foreground' : 'text-foreground',
                    label === 'Status' && value === 'Active' ? 'text-foreground' : ''
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
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <Zap className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold text-foreground text-sm">Quick Actions</h3>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(role === 'Admin' || role === 'Secretary') ? (
                <>
                  <QuickAction label="Add Member" href="/admin" icon={UserPlus} />
                  {role === 'Admin' && <QuickAction label="Add Donation" href="/donations" icon={IndianRupee} />}
                  <QuickAction label="Announcement" href="/announcements" icon={Megaphone} />
                  <QuickAction label="New Event" href="/events" icon={CalendarDays} />
                  {role === 'Admin' && <QuickAction label="Admin Panel" href="/admin" icon={Shield} />}
                </>
              ) : (
                <>
                  <QuickAction label="Pay Donation" href="/donations" icon={IndianRupee} />
                  <QuickAction label="My ID Card" href="/digital-id" icon={CreditCard} />
                  <QuickAction label="Documents" href="/documents" icon={FileText} />
                  <QuickAction label="Members" href="/members" icon={Users} />
                  <QuickAction label="Events" href="/events" icon={CalendarDays} />
                  <QuickAction label="Promotions" href="/promotions" icon={TrendingUp} />
                </>
              )}
            </div>
          </div>

          {/* Donation Status Card */}
          <div className={cn(
            'rounded-xl border p-5',
            donationStatus?.status === DONATION_STATUS.PAID
              ? 'bg-muted border-border'
              : 'bg-muted border-border'
          )}>
            <div className="flex items-center gap-2 mb-3">
              <BadgeCheck className={cn('w-4 h-4', donationStatus?.status === DONATION_STATUS.PAID ? 'text-foreground' : 'text-muted-foreground')} />
              <h3 className={cn('font-semibold text-sm', donationStatus?.status === DONATION_STATUS.PAID ? 'text-foreground' : 'text-muted-foreground')}>
                {currentYear} Donation
              </h3>
            </div>
            <p className={cn('text-2xl font-bold', donationStatus?.status === DONATION_STATUS.PAID ? 'text-foreground' : 'text-muted-foreground')}>
              {formatCurrency(donationStatus?.amount ?? 500)}
            </p>
            <p className={cn('text-sm mt-1', donationStatus?.status === DONATION_STATUS.PAID ? 'text-foreground' : 'text-muted-foreground')}>
              {donationStatus?.status === DONATION_STATUS.PAID
                ? `Paid on ${formatDate(donationStatus.payment_date!)}`
                : `Due — Please pay before Dec 31, ${currentYear}`}
            </p>
            {donationStatus?.status !== DONATION_STATUS.PAID && (
              <Link href="/donations" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-foreground hover:underline">
                Pay Now <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
