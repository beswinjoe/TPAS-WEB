'use client';

import { Menu, Bell, Sun, Moon, ChevronDown, LogOut, User, Settings } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase/client';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { cn, getInitials } from '@/lib/utils';
import type { Role } from '@/types';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/members': 'Members',
  '/donations': 'Donations',
  '/payment-history': 'Payment History',
  '/promotions': 'Promotions',
  '/divisions': 'Divisions',
  '/announcements': 'Announcements',
  '/events': 'Events',
  '/documents': 'Documents',
  '/digital-id': 'Digital ID',
  '/profile': 'Profile',
  '/admin': 'Administration',
  '/notifications': 'Notifications',
};

interface HeaderProps {
  onMobileMenuOpen: () => void;
  loading?: boolean;
}

export function Header({ onMobileMenuOpen, loading }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const { member, role, logout } = useAuth();
  const pathname = usePathname();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifMenuOpen, setNotifMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [hasUnread, setHasUnread] = useState(false);
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    async function loadNotifs() {
      try {
        const snap = await getDocs(query(collection(db, 'activity_logs'), orderBy('created_at', 'desc'), limit(5)));
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
        if (data && data.length > 0) {
          setNotifications(data);
          const lastSeenStr = localStorage.getItem(`tpas_notif_seen_${member!.id}`);
          const lastSeen = lastSeenStr ? new Date(lastSeenStr).getTime() : 0;
          const latestNotif = new Date(data[0].created_at as string).getTime();
          if (latestNotif > lastSeen) {
            setHasUnread(true);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    if (member && !loading) loadNotifs();
  }, [member, loading]);

  function handleBellClick() {
    if (!notifMenuOpen) {
      setHasUnread(false);
      localStorage.setItem(`tpas_notif_seen_${member!.id}`, new Date().toISOString());
      window.dispatchEvent(new Event('tpas_notif_read'));
    }
    setNotifMenuOpen(!notifMenuOpen);
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    
    function handleNotifRead() {
      setHasUnread(false);
    }
    window.addEventListener('tpas_notif_read', handleNotifRead);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('tpas_notif_read', handleNotifRead);
    };
  }, []);

  const pageTitle = Object.entries(PAGE_TITLES).find(([key]) => pathname.startsWith(key))?.[1] ?? 'Portal';

  return (
    <header className="sticky top-0 z-30 h-14 flex items-center gap-3 px-4 md:px-6 bg-card border-b border-border">
      {/* Mobile menu button */}
      <button
        onClick={onMobileMenuOpen}
        className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Page Title */}
      <div className="flex-1">
        <h1 className="text-sm font-semibold text-foreground">{pageTitle}</h1>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1">
        {/* Theme Toggle */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        )}

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={handleBellClick}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground relative"
          >
            <Bell className="w-4 h-4" />
            {hasUnread && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-card" />
            )}
          </button>
          
          {notifMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-80 bg-card rounded-lg shadow-lg border border-border overflow-hidden animate-slide-up z-50">
              <div className="px-4 py-3 border-b border-border flex justify-between items-center">
                <p className="text-sm font-semibold text-foreground">Notifications</p>
                <Link href="/notifications" onClick={() => setNotifMenuOpen(false)} className="text-xs text-muted-foreground hover:text-foreground font-medium transition-colors">View all</Link>
              </div>
              <div className="divide-y divide-border max-h-[280px] overflow-y-auto scrollbar-thin">
                {notifications.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-8">No new notifications</p>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className="px-4 py-3 hover:bg-muted/50 transition-colors">
                      <p className="text-xs text-foreground leading-relaxed">{n.details}</p>
                      <p className="text-[10px] text-muted-foreground mt-1.5">{new Date(n.created_at).toLocaleDateString()} at {new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => !loading && setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 pl-2 pr-2 py-1.5 rounded-lg hover:bg-muted transition-all duration-150 ml-1"
            disabled={loading ? true : undefined}
            suppressHydrationWarning
          >
            <div className="w-7 h-7 rounded-full bg-muted border border-border flex items-center justify-center text-foreground font-semibold text-xs shrink-0 overflow-hidden">
              {loading ? (
                <div className="w-full h-full bg-muted-foreground/20 animate-pulse" />
              ) : member?.photo_url ? (
                <img src={member.photo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                getInitials(member?.name ?? 'U')
              )}
            </div>
            <div className="hidden md:block text-left">
              {loading ? (
                <div className="h-3 w-20 bg-muted rounded animate-pulse" />
              ) : (
                <p className="text-xs font-semibold text-foreground leading-tight max-w-24 truncate">{member?.name}</p>
              )}
            </div>
            {!loading && <ChevronDown className={cn('w-3 h-3 text-muted-foreground transition-transform duration-150 hidden md:block', userMenuOpen && 'rotate-180')} />}
          </button>

          {/* Dropdown */}
          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-card rounded-lg shadow-lg border border-border overflow-hidden animate-slide-up z-50">
              {/* User info */}
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-semibold text-foreground truncate">{member?.name}</p>
                <p className="text-xs text-muted-foreground">{member?.employee_id}</p>
                {role && (
                  <span className="inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground border border-border">
                    {role}
                  </span>
                )}
              </div>
              <div className="p-1">
                <Link
                  href="/profile"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-colors"
                >
                  <User className="w-4 h-4 text-muted-foreground" />
                  Profile
                </Link>
                {role === 'Admin' && (
                  <Link
                    href="/admin"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-colors"
                  >
                    <Settings className="w-4 h-4 text-muted-foreground" />
                    Administration
                  </Link>
                )}
                <div className="border-t border-border mt-1 pt-1">
                  <button
                    onClick={() => { setUserMenuOpen(false); logout(); }}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors w-full text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
