'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/client';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { useAuth } from '@/lib/auth-context';
import type { ActivityLog } from '@/types';
import { formatDate, cn } from '@/lib/utils';
import {
  Bell, Users, IndianRupee, TrendingUp, UserCheck, CreditCard,
  Activity, Check, CheckCheck, Trash2
} from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ListSkeleton } from '@/components/ui/skeletons';

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
  LOGIN: 'text-muted-foreground bg-muted',
  LOGOUT: 'text-muted-foreground bg-muted',
  ADD_MEMBER: 'text-muted-foreground bg-muted',
  RESET_PASSWORD: 'text-muted-foreground bg-muted',
  DELETE_MEMBER: 'text-muted-foreground bg-muted',
  UPDATE_MEMBER: 'text-muted-foreground bg-muted',
  PAY_DONATION: 'text-muted-foreground bg-muted',
  PROMOTION: 'text-muted-foreground bg-muted',
};

const ACTION_LABELS: Record<string, string> = {
  LOGIN: 'Login',
  LOGOUT: 'Logout',
  ADD_MEMBER: 'New Member',
  RESET_PASSWORD: 'Password Reset',
  DELETE_MEMBER: 'Member Deleted',
  UPDATE_MEMBER: 'Member Updated',
  PAY_DONATION: 'Donation',
  PROMOTION: 'Promotion',
};

export default function NotificationsPage() {
  const { member } = useAuth();
  const [notifications, setNotifications] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [filterAction, setFilterAction] = useState('');

  useEffect(() => {
    // Load read notifications from localStorage
    const saved = localStorage.getItem('tpas_read_notifications');
    if (saved) setReadIds(new Set(JSON.parse(saved)));
    loadNotifications();

    if (member) {
      localStorage.setItem(`tpas_notif_seen_${member.id}`, new Date().toISOString());
      window.dispatchEvent(new Event('tpas_notif_read'));
    }
  }, [member]);

  async function loadNotifications() {
    setLoading(true);
    setError(null);
    try {
      const snap = await getDocs(query(collection(db, 'activity_logs'), orderBy('created_at', 'desc'), limit(100)));
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })) as ActivityLog[]);
    } catch (error) {
      setError('Unable to load notifications.');
    }
    setLoading(false);
  }

  function markAsRead(id: string) {
    const newSet = new Set(readIds);
    newSet.add(id);
    setReadIds(newSet);
    localStorage.setItem('tpas_read_notifications', JSON.stringify([...newSet]));
  }

  function markAllAsRead() {
    const newSet = new Set(readIds);
    notifications.forEach(n => newSet.add(n.id));
    setReadIds(newSet);
    localStorage.setItem('tpas_read_notifications', JSON.stringify([...newSet]));
    
    if (member) {
      localStorage.setItem(`tpas_notif_seen_${member.id}`, new Date().toISOString());
      window.dispatchEvent(new Event('tpas_notif_read'));
    }
  }

  function clearAll() {
    setReadIds(new Set(notifications.map(n => n.id)));
    localStorage.setItem('tpas_read_notifications', JSON.stringify(notifications.map(n => n.id)));
  }

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

  const filtered = filterAction
    ? notifications.filter(n => n.action === filterAction)
    : notifications;

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;
  const actions = [...new Set(notifications.map(n => n.action))];

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Bell className="w-5 h-5 text-muted-foreground" />
            Notification Center
          </h2>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All notifications read'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10 transition-all"
          >
            <option value="">All Types</option>
            {actions.map(a => <option key={a} value={a}>{ACTION_LABELS[a] ?? a}</option>)}
          </select>
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border rounded-lg text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" /> Mark All Read
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {error && !loading ? (
          <ErrorState message={error} onRetry={loadNotifications} />
        ) : loading ? (
          <div className="p-4">
            <ListSkeleton items={8} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Bell} title="No notifications" description="You're all caught up!" className="py-16" />
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((log) => {
              const Icon = ACTION_ICONS[log.action] ?? Activity;
              const colorClass = 'text-muted-foreground bg-muted';
              const isRead = readIds.has(log.id);
              return (
                <div
                  key={log.id}
                  className={cn(
                    'px-5 py-4 flex items-center gap-4 hover:bg-muted/30 transition-colors cursor-pointer',
                    !isRead && 'bg-primary/5'
                  )}
                  onClick={() => markAsRead(log.id)}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm truncate', !isRead ? 'font-semibold text-foreground' : 'text-foreground')}>
                      {log.details}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">{timeAgo(log.created_at)}</span>
                      <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground font-medium">
                        {ACTION_LABELS[log.action] ?? log.action.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  {!isRead && (
                    <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
