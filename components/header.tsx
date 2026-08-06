'use client';

import { Menu, Bell, Sun, Moon, Search, ChevronDown, LogOut, User, Settings } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/lib/auth-context';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { cn, getInitials } from '@/lib/utils';
import { ROLE_COLORS } from '@/lib/constants';
import type { Role } from '@/types';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/members': 'Member Directory',
  '/donations': 'Donations',
  '/payment-history': 'Payment History',
  '/promotions': 'Promotions',
  '/divisions': 'Divisions',
  '/announcements': 'Announcements',
  '/events': 'Events',
  '/documents': 'Documents',
  '/digital-id': 'Digital Member ID',
  '/profile': 'My Profile',
  '/admin': 'Admin Panel',
  '/notifications': 'Notifications',
};

interface HeaderProps {
  onMobileMenuOpen: () => void;
}

export function Header({ onMobileMenuOpen }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const { member, role, logout } = useAuth();
  const pathname = usePathname();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const pageTitle = Object.entries(PAGE_TITLES).find(([key]) => pathname.startsWith(key))?.[1] ?? 'Portal';

  return (
    <header className="sticky top-0 z-30 h-16 flex items-center gap-3 px-4 md:px-6 bg-background/80 backdrop-blur-sm border-b border-border">
      {/* Mobile menu button */}
      <button
        onClick={onMobileMenuOpen}
        className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Page Title */}
      <div className="flex-1">
        <h1 className="text-base md:text-lg font-semibold text-foreground">{pageTitle}</h1>
        <p className="text-xs text-muted-foreground hidden md:block">
          TPAS Kanniyakumari Member Portal
        </p>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
          </button>
        )}

        {/* Notifications */}
        <Link href="/notifications" className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground relative">
          <Bell className="w-4.5 h-4.5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </Link>

        {/* User Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-muted transition-all duration-200 border border-transparent hover:border-border"
          >
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white font-semibold text-sm shrink-0">
              {member?.photo_url ? (
                <img src={member.photo_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                getInitials(member?.name ?? 'U')
              )}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-semibold text-foreground leading-tight max-w-24 truncate">{member?.name}</p>
              <p className="text-xs text-muted-foreground leading-tight">{member?.employee_id}</p>
            </div>
            <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform duration-200', userMenuOpen && 'rotate-180')} />
          </button>

          {/* Dropdown */}
          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-card rounded-xl shadow-xl border border-border overflow-hidden animate-fade-in z-50">
              {/* User info */}
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-semibold text-foreground truncate">{member?.name}</p>
                <p className="text-xs text-muted-foreground">{member?.employee_id}</p>
                {role && (
                  <span className={cn('inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full font-medium', ROLE_COLORS[role as Role])}>
                    {role}
                  </span>
                )}
              </div>
              <div className="p-1">
                <Link
                  href="/profile"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  <User className="w-4 h-4 text-muted-foreground" />
                  My Profile
                </Link>
                {role === 'Admin' && (
                  <Link
                    href="/admin"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors"
                  >
                    <Settings className="w-4 h-4 text-muted-foreground" />
                    Admin Panel
                  </Link>
                )}
                <div className="border-t border-border mt-1 pt-1">
                  <button
                    onClick={() => { setUserMenuOpen(false); logout(); }}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors w-full text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
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
