'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import {
  LayoutDashboard, Users, IndianRupee, History, TrendingUp,
  Building2, Megaphone, CalendarDays, FolderOpen, CreditCard,
  Shield, ChevronLeft, LogOut, X, Bell
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { NAV_ITEMS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Role } from '@/types';

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard, Users, IndianRupee, History, TrendingUp,
  Building2, Megaphone, CalendarDays, FolderOpen, CreditCard, Shield, Bell,
};

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onCollapse: (v: boolean) => void;
  onMobileClose: () => void;
}

export function Sidebar({ collapsed, mobileOpen, onCollapse, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { member, role, logout } = useAuth();

  const filteredNav = NAV_ITEMS.filter((item) =>
    role && item.roles.includes(role as Role)
  );

  const sidebarContent = (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'linear-gradient(180deg, #0F2044 0%, #1a3a6c 100%)' }}>
      {/* Logo Header */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-5 border-b border-white/10 shrink-0',
        collapsed && 'justify-center px-2'
      )}>
        <div className="relative shrink-0">
          <Image
            src="/images/logo.jpg"
            alt="TPAS Logo"
            width={collapsed ? 36 : 42}
            height={collapsed ? 36 : 42}
            className="rounded-xl object-contain"
          />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-white font-bold text-sm leading-tight">TPAS</p>
            <p className="text-blue-200 text-xs leading-tight">Kanniyakumari</p>
          </div>
        )}
        {/* Desktop collapse button */}
        <button
          onClick={() => onCollapse(!collapsed)}
          className={cn(
            'hidden lg:flex ml-auto items-center justify-center w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all duration-200 shrink-0',
            collapsed && 'ml-0 mt-0'
          )}
        >
          <ChevronLeft className={cn('w-3.5 h-3.5 transition-transform duration-300', collapsed && 'rotate-180')} />
        </button>
        {/* Mobile close button */}
        <button
          onClick={onMobileClose}
          className="lg:hidden ml-auto flex items-center justify-center w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-3 px-2 space-y-0.5">
        {filteredNav.map((item) => {
          const Icon = iconMap[item.icon];
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative',
                isActive
                  ? 'bg-blue-500/25 text-white shadow-sm'
                  : 'text-blue-100/70 hover:text-white hover:bg-white/8',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? item.label : undefined}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-400 rounded-r-full" />
              )}
              {Icon && (
                <Icon className={cn(
                  'shrink-0 transition-all duration-200',
                  collapsed ? 'w-5 h-5' : 'w-4.5 h-4.5',
                  isActive ? 'text-blue-300' : 'text-blue-200/60 group-hover:text-blue-200'
                )} />
              )}
              {!collapsed && <span className="truncate">{item.label}</span>}
              {/* Tooltip for collapsed state */}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                  {item.label}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className={cn(
        'border-t border-white/10 p-3 shrink-0',
        collapsed && 'p-2'
      )}>
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-500/30 border border-blue-400/30 flex items-center justify-center text-white font-semibold text-sm shrink-0">
              {member?.name?.slice(0, 1) ?? '?'}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-white text-xs font-semibold truncate">{member?.name}</p>
              <p className="text-blue-300/70 text-xs truncate">{member?.employee_id}</p>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 rounded-lg text-blue-200/60 hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={logout}
            title="Logout"
            className="w-full flex items-center justify-center p-2 rounded-lg text-blue-200/60 hover:text-red-400 hover:bg-red-500/10 transition-all"
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
        'hidden lg:flex flex-col h-screen sticky top-0 transition-all duration-300 shrink-0 shadow-2xl',
        collapsed ? 'w-16' : 'w-60'
      )}>
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40 animate-fade-in"
            onClick={onMobileClose}
          />
          <aside className="lg:hidden fixed left-0 top-0 h-full w-64 z-50 shadow-2xl animate-slide-in-left">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
