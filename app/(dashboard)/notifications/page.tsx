'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import type { ActivityLog } from '@/types';
import { formatDate, cn } from '@/lib/utils';
import {
  Bell, Users, IndianRupee, TrendingUp, UserCheck, CreditCard,
  Activity, Check, CheckCheck, Trash2
} from 'lucide-react';

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
  const supabase = createClient();
  const [notifications, setNotifications] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
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
    const { data } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    setNotifications((data as ActivityLog[]) ?? []);
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
            <Bell className="w-5 h-5 text-primary" />
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
            className="px-3 py-2 bg-muted/50 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">All Types</option>
            {actions.map(a => <option key={a} value={a}>{ACTION_LABELS[a] ?? a}</option>)}
          </select>
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border rounded-xl text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" /> Mark All Read
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {loading ? (
          <div className="divide-y divide-border">
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className="px-5 py-4 flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-muted" />
                <div className="flex-1">
                  <div className="h-3.5 w-64 bg-muted rounded mb-2" />
                  <div className="h-3 w-24 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground font-medium">No notifications</p>
            <p className="text-muted-foreground text-sm mt-1">You&apos;re all caught up!</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((log) => {
              const Icon = ACTION_ICONS[log.action] ?? Activity;
              const colorClass = ACTION_COLORS[log.action] ?? 'text-gray-500 bg-gray-50 dark:bg-gray-950';
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
