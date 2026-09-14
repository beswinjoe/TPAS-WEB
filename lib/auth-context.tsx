'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Member, Role } from '@/types';
import { setSessionCookie, clearSessionCookie } from '@/app/actions/auth';
import { auth, db } from '@/lib/firebase/client';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence, browserSessionPersistence, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface AuthContextType {
  member: Member | null;
  role: Role | null;
  loading: boolean;
  login: (employeeId: string, password: string, remember: boolean, loginType?: 'Member' | 'Admin') => Promise<{ error: string | null }>;
  loginWithGoogle: (loginType?: 'Member' | 'Admin') => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  updateMember: (updates: Partial<Member>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await fetchMember(firebaseUser.uid);
      } else {
        setMember(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  async function fetchMember(uid: string) {

    try {
      const docRef = doc(db, 'members', uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const memberData = docSnap.data() as Member;
        memberData.id = docSnap.id;
        setMember(memberData);
        // Ensure server action cookie is synced
        await setSessionCookie(uid); 
      } else {
        await auth.signOut();
        await clearSessionCookie();
        setMember(null);
      }
    } catch (e) {
      console.error('Error fetching member:', e);
      setMember(null);
    }
    setLoading(false);
  }

  async function verifyAndAuthorizeUser(user: any, loginType: 'Member' | 'Admin'): Promise<{ error: string | null }> {
    const uid = user.uid;
    const docRef = doc(db, 'members', uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      await auth.signOut();
      return { error: 'Invalid account data or no TPAS profile found.' };
    }

    const memberData = docSnap.data() as Member;
    memberData.id = uid;

    if (memberData.status !== 'Active') {
      await auth.signOut();
      return { error: 'Your account is not active. Contact admin.' };
    }

    if (loginType === 'Admin' && memberData.role !== 'Admin') {
      await auth.signOut();
      return { error: 'This login is restricted to administrators only.' };
    }

    if (loginType === 'Member' && memberData.role === 'Admin') {
      await auth.signOut();
      return { error: 'You are an Admin. Please use the Admin tab to log in.' };
    }

    // Log activity
    try {
      await addDoc(collection(db, 'activity_logs'), {
        member_id: uid,
        action: 'LOGIN',
        details: `Member ${memberData.name} logged in`,
        created_at: new Date().toISOString()
      });
    } catch (e) {
      console.error('Failed to log activity', e);
    }

    await setSessionCookie(uid);
    setMember(memberData);
    return { error: null };
  }

  async function login(employeeId: string, password: string, remember: boolean, loginType: 'Member' | 'Admin' = 'Member'): Promise<{ error: string | null }> {
    setLoading(true);
    try {
      // 1. Convert employeeId to pseudo-email (replace @ to avoid double @ for cases like admin@id)
      const sanitizedId = employeeId.toLowerCase().replace(/@/g, '_');
      const email = `${sanitizedId}@tpas.internal`;

      // 2. Set Persistence
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);

      // 3. Sign in via Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // 4. Verify & Authorize
      const result = await verifyAndAuthorizeUser(userCredential.user, loginType);
      
      setLoading(false);
      return result;
    } catch (err: any) {
      setLoading(false);
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        return { error: 'Invalid Employee ID or password.' };
      }
      return { error: 'An unexpected error occurred. Please try again.' };
    }
  }

  async function loginWithGoogle(loginType: 'Member' | 'Admin' = 'Member'): Promise<{ error: string | null }> {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      
      const result = await verifyAndAuthorizeUser(userCredential.user, loginType);
      
      setLoading(false);
      return result;
    } catch (err: any) {
      setLoading(false);
      console.error(err);
      if (err.code === 'auth/popup-closed-by-user') {
        return { error: 'Sign-in cancelled.' };
      }
      return { error: 'Failed to sign in with Google.' };
    }
  }

  async function logout() {
    if (member) {
      try {
        await addDoc(collection(db, 'activity_logs'), {
          member_id: member.id,
          action: 'LOGOUT',
          details: `Member ${member.name} logged out`,
          created_at: new Date().toISOString()
        });
      } catch (e) {
        console.error('Failed to log logout activity', e);
      }
    }
    
    await signOut(auth);
    await clearSessionCookie();
    setMember(null);
  }

  function updateMember(updates: Partial<Member>) {
    setMember((prev) => prev ? { ...prev, ...updates } : null);
  }

  return (
    <AuthContext.Provider value={{ member, role: member?.role ?? null, loading, login, loginWithGoogle, logout, updateMember }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
