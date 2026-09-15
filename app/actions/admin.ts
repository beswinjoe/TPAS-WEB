'use server';

import { getAdminAuth, getAdminDb } from '@/lib/firebase/server';
import { cookies } from 'next/headers';
import type { Role } from '@/types';

/**
 * Validates the currently authenticated session using the secure HttpOnly cookie.
 * Ensures the user exists, is Active, and has the Admin role.
 */
async function getAuthenticatedAdmin() {
  const cookieStore = await cookies();
  const memberId = cookieStore.get('tpas_member_id')?.value;
  
  if (!memberId) {
    throw new Error('Not authenticated.');
  }

  const db = await getAdminDb();
  const docSnap = await db.collection('members').doc(memberId).get();
  
  if (!docSnap.exists) {
    throw new Error('Member profile not found.');
  }
  
  const member = docSnap.data();
  if (member?.status !== 'Active') {
    throw new Error('Account is not active.');
  }
  
  if (member?.role !== 'Admin') {
    throw new Error('Forbidden: Admin access required.');
  }

  const auth = await getAdminAuth();
  const authRecord = await auth.getUser(memberId);
  if (authRecord.disabled) {
    throw new Error('Authentication account is disabled.');
  }

  return { id: docSnap.id, ...member };
}

export async function createFirebaseUserAction(data: {
  employee_id: string;
  name: string;
  phone: string;
  email: string;
  role: Role;
  division: string | null;
  sub_division: string | null;
  joining_date: string;
  status: string;
  password?: string;
}) {
  try {
    const adminUser = await getAuthenticatedAdmin();

    if (!data.employee_id || !data.name) {
      return { success: false, error: 'Employee ID and name are required.' };
    }
    
    if (!data.password || data.password.trim().length < 8) {
      return { success: false, error: 'Password is required and must be at least 8 characters long.' };
    }

    const email = data.email || `${data.employee_id.trim().toLowerCase()}@tpas.internal`;
    const employee_id = data.employee_id.trim();
    const password = data.password.trim();

    const db = await getAdminDb();
    const auth = await getAdminAuth();

    // Duplicate Check
    const duplicateCheck = await db.collection('members').where('employee_id', '==', employee_id).get();
    if (!duplicateCheck.empty) {
      return { success: false, error: 'This Employee ID is already registered.' };
    }

    // 1. Create Firebase Auth User
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: data.name,
    });

    const uid = userRecord.uid;

    // 2. Create Member document and dependencies
    try {
      await db.collection('members').doc(uid).set({
        employee_id,
        name: data.name,
        phone: data.phone || null,
        email,
        role: data.role,
        division: data.division || null,
        sub_division: data.sub_division || null,
        joining_date: data.joining_date || null,
        status: data.status,
        created_at: new Date().toISOString(),
      });

      // 3. Log activity using the verified Admin ID
      await db.collection('activity_logs').add({
        member_id: adminUser.id,
        action: 'ADD_MEMBER',
        details: `Added new member: ${data.name} (${data.employee_id})`,
        created_at: new Date().toISOString(),
      });

      // DO NOT return the password
      return { success: true, uid };
    } catch (dbError: any) {
      // Rollback: Delete the auth user if Firestore fails
      console.error('Firestore creation failed, rolling back Auth user:', dbError);
      try {
        await auth.deleteUser(uid);
      } catch (rollbackError) {
        console.error('CRITICAL: Failed to rollback Auth user after DB failure:', rollbackError);
      }
      return { success: false, error: 'Database error. Account creation was rolled back.' };
    }
  } catch (error: any) {
    console.error('Error creating user:', error);
    return { success: false, error: error?.message || 'An unknown error occurred.' };
  }
}

export async function resetFirebaseUserPasswordAction(uid: string, newPassword: string, memberName: string) {
  try {
    const adminUser = await getAuthenticatedAdmin();

    if (!newPassword || newPassword.trim().length < 8) {
      return { success: false, error: 'Password must be at least 8 characters long.' };
    }

    const auth = await getAdminAuth();
    const db = await getAdminDb();

    await auth.updateUser(uid, { password: newPassword.trim() });
    
    await db.collection('activity_logs').add({
      member_id: adminUser.id,
      action: 'RESET_PASSWORD',
      details: `Reset password for: ${memberName}`,
      created_at: new Date().toISOString(),
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('Error resetting password:', error);
    return { success: false, error: error?.message || 'An unknown error occurred.' };
  }
}
