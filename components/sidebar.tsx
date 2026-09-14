'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import {
  LayoutDashboard, Users, IndianRupee, History, TrendingUp,
  Building2, Megaphone, CalendarDays, FolderOpen, CreditCard,
  Shield, ChevronLeft, LogOut, X, Bell, User
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { NAV_ITEMS } from '@/lib/constants';
import { cn, getInitials } from '@/lib/utils';
import type { Role } from '@/types';

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard, Users, IndianRupee, History, TrendingUp,
  Building2, Megaphone, CalendarDays, FolderOpen, CreditCard, Shield, Bell,
};

// Section groupings for the sidebar nav
const SECTIONS: { label: string; items: string[] }[] = [
  { label: 'Overview', items: ['/dashboard'] },
  { label: 'People', items: ['/members', '/divisions'] },
  { label: 'Activity', items: ['/announcements', '/events', '/notifications'] },
  { label: 'Finance', items: ['/donations', '/payment-history', '/promotions'] },
  { label: 'Tools', items: ['/documents', '/digital-id'] },
  { label: 'System', items: ['/admin'] },
];

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onCollapse: (v: boolean) => void;
  onMobileClose: () => void;
  loading?: boolean;
}

export function Sidebar({ collapsed, mobileOpen, onCollapse, onMobileClose, loading }: SidebarProps) {
  const pathname = usePathname();
  const { member, role, logout } = useAuth();

  const filteredNav = loading ? NAV_ITEMS : NAV_ITEMS.filter((item) =>
    role && item.roles.includes(role as Role)
  );

  const filteredHrefs = new Set(filteredNav.map(i => i.href));

  const sidebarContent = (
    <div className="flex flex-col h-full overflow-hidden bg-card border-r border-border">
      {/* Logo Header */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-4 border-b border-border shrink-0',
        collapsed && 'justify-center px-3'
      )}>
        <div className="relative shrink-0">
          <Image
            src="/images/logo.jpg"
            alt="TPAS Logo"
            width={collapsed ? 32 : 36}
            height={collapsed ? 32 : 36}
            className="rounded-lg object-contain"
          />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-foreground font-semibold text-sm leading-tight">TPAS</p>
            <p className="text-muted-foreground text-xs leading-tight">Kanniyakumari</p>
          </div>
        )}
        {/* Desktop collapse button */}
        <button
          onClick={() => onCollapse(!collapsed)}
          className={cn(
            'hidden lg:flex ml-auto items-center justify-center w-6 h-6 rounded-md border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all shrink-0',
            collapsed && 'ml-0'
          )}
        >
          <ChevronLeft className={cn('w-3.5 h-3.5 transition-transform duration-200', collapsed && 'rotate-180')} />
        </button>
        {/* Mobile close button */}
        <button
          onClick={onMobileClose}
          className="lg:hidden ml-auto flex items-center justify-center w-7 h-7 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav Items — grouped by section */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-2 px-2">
        {loading ? (
          <div className="space-y-4 py-4 px-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="space-y-2">
                {!collapsed && <div className="h-3 w-16 bg-muted rounded animate-pulse mb-3 ml-1" />}
                <div className="h-9 w-full bg-muted rounded-lg animate-pulse" />
                <div className="h-9 w-full bg-muted rounded-lg animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          SECTIONS.map((section) => {
            const sectionItems = filteredNav.filter(item => section.items.includes(item.href));
            if (sectionItems.length === 0) return null;

            return (
              <div key={section.label} className="mb-1">
                {!collapsed && (
                  <p className="px-3 pt-4 pb-1.5 text-[10px] font-semibold tracking-[0.1em] uppercase text-muted-foreground/60">
                    {section.label}
                  </p>
                )}
                {collapsed && <div className="h-3" />}
                {sectionItems.map((item) => {
                  const Icon = iconMap[item.icon];
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onMobileClose}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 group relative mb-0.5',
                        isActive
                          ? 'bg-muted text-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                        collapsed && 'justify-center px-2'
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-foreground rounded-r-full" />
                      )}
                      {Icon && (
                        <Icon className={cn(
                          'shrink-0 transition-colors',
                          collapsed ? 'w-5 h-5' : 'w-4 h-4',
                          isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
                        )} />
                      )}
                      {!collapsed && <span className="truncate">{item.label}</span>}
                      {/* Tooltip for collapsed state */}
                      {collapsed && (
                        <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-foreground text-background text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg">
                          {item.label}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })
        )}
      </nav>

      {/* User Footer */}
      <div className={cn(
        'border-t border-border p-3 shrink-0',
        collapsed && 'p-2'
      )}>
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center text-foreground font-semibold text-xs shrink-0">
              {loading ? (
                <div className="w-full h-full rounded-full bg-muted-foreground/20 animate-pulse" />
              ) : member?.photo_url ? (
                <img src={member.photo_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                getInitials(member?.name ?? '?')
              )}
            </div>
            <div className="overflow-hidden flex-1">
              {loading ? (
                <div className="space-y-1.5">
                  <div className="h-3.5 w-24 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                </div>
              ) : (
                <>
                  <p className="text-foreground text-xs font-semibold truncate">{member?.name}</p>
                  <p className="text-muted-foreground text-[11px] truncate">{member?.employee_id}</p>
                </>
              )}
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={logout}
            title="Sign out"
            className="w-full flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={cn(
        'hidden lg:flex flex-col h-screen sticky top-0 transition-all duration-200 shrink-0',
        collapsed ? 'w-16' : 'w-60'
      )}>
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/40 z-40 animate-fade-in"
            onClick={onMobileClose}
          />
          <aside className="lg:hidden fixed left-0 top-0 h-full w-64 z-50 shadow-xl animate-slide-in-left">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
