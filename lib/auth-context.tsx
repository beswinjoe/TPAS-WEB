'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Member, Role } from '@/types';
import { setSessionCookie, clearSessionCookie } from '@/app/actions/auth';

interface AuthContextType {
  member: Member | null;
  role: Role | null;
  loading: boolean;
  login: (employeeId: string, password: string, remember: boolean, loginType?: 'Member' | 'Admin') => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  updateMember: (updates: Partial<Member>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Check for saved session
    const savedMemberId = localStorage.getItem('tpas_member_id') || sessionStorage.getItem('tpas_member_id');
    if (savedMemberId) {
      fetchMember(savedMemberId);
    } else {
      setLoading(false);
    }
  }, []);

  async function fetchMember(memberId: string) {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('id', memberId)
      .single();
    if (data && !error) {
      setMember(data);
    } else {
      localStorage.removeItem('tpas_member_id');
      sessionStorage.removeItem('tpas_member_id');
    }
    setLoading(false);
  }

  async function login(employeeId: string, password: string, remember: boolean, loginType: 'Member' | 'Admin' = 'Member'): Promise<{ error: string | null }> {
    setLoading(true);
    try {
      // Find member by employee_id
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('employee_id', employeeId.toUpperCase())
        .single();

      if (memberError || !memberData) {
        setLoading(false);
        return { error: 'Invalid Employee ID or password.' };
      }

      // Check password
      const { data: authData, error: authError } = await supabase
        .from('member_auth')
        .select('password_hash')
        .eq('member_id', memberData.id)
        .single();

      if (authError || !authData) {
        setLoading(false);
        return { error: 'Authentication failed. Please contact admin.' };
      }

      if (authData.password_hash !== password) {
        setLoading(false);
        return { error: 'Invalid Employee ID or password.' };
      }

      if (memberData.status !== 'Active') {
        setLoading(false);
        return { error: 'Your account is not active. Contact admin.' };
      }

      if (loginType === 'Admin' && memberData.role !== 'Admin') {
        setLoading(false);
        return { error: 'This login is restricted to administrators only.' };
      }

      if (loginType === 'Member' && memberData.role === 'Admin') {
        setLoading(false);
        return { error: 'You are an Admin. Please use the Admin tab to log in.' };
      }

      // Update last login
      await supabase
        .from('member_auth')
        .update({ last_login: new Date().toISOString() })
        .eq('member_id', memberData.id);

      // Log activity
      await supabase.from('activity_logs').insert({
        member_id: memberData.id,
        action: 'LOGIN',
        details: `Member ${memberData.name} logged in`,
      });

      // Save session
      if (remember) {
        localStorage.setItem('tpas_member_id', memberData.id);
      } else {
        sessionStorage.setItem('tpas_member_id', memberData.id);
      }
      // Also set secure HTTP-only cookie for Server Actions
      await setSessionCookie(memberData.id);

      setMember(memberData);
      setLoading(false);
      return { error: null };
    } catch (err) {
      setLoading(false);
      return { error: 'An unexpected error occurred. Please try again.' };
    }
  }

  async function logout() {
    if (member) {
      await supabase.from('activity_logs').insert({
        member_id: member.id,
        action: 'LOGOUT',
        details: `Member ${member.name} logged out`,
      });
    }
    localStorage.removeItem('tpas_member_id');
    sessionStorage.removeItem('tpas_member_id');
    await clearSessionCookie();
    setMember(null);
  }

  function updateMember(updates: Partial<Member>) {
    setMember((prev) => prev ? { ...prev, ...updates } : null);
  }

  return (
    <AuthContext.Provider value={{ member, role: member?.role ?? null, loading, login, logout, updateMember }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
