'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { useAuth } from '@/lib/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { ALLOWED_ROUTES } from '@/lib/constants';
import type { Role } from '@/types';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { member, loading, role } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!member) {
        router.replace('/login');
      } else if (role) {
        const baseRoute = '/' + (pathname.split('/')[1] || '');
        const allowed = ALLOWED_ROUTES[role as Role] || [];
        if (!allowed.includes(baseRoute) && baseRoute !== '/') {
          router.replace('/dashboard');
        } else {
          setIsAuthorized(true);
        }
      }
    }
  }, [member, loading, router, pathname, role]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCollapse={setCollapsed}
        onMobileClose={() => setMobileOpen(false)}
        loading={loading}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMobileMenuOpen={() => setMobileOpen(true)} loading={loading} />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-4 md:p-6 animate-slide-up">
            {loading || (!isAuthorized && member) ? (
              <div className="flex flex-col items-center justify-center py-32 opacity-50 animate-pulse">
                <div className="w-12 h-12 bg-muted rounded-xl mb-4" />
                <div className="h-4 w-32 bg-muted rounded" />
              </div>
            ) : !member ? null : (
              children
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
