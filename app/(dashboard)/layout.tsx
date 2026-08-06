'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { member, loading } = useAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !member) {
      router.replace('/login');
    }
  }, [member, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full gradient-primary animate-pulse" />
          <p className="text-muted-foreground text-sm animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  if (!member) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCollapse={setCollapsed}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMobileMenuOpen={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-4 md:p-6 animate-slide-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
