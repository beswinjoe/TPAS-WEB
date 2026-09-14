'use server';

import { adminAuth, adminDb } from '@/lib/firebase/server';
import type { Role } from '@/types';

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
  adminUid: string;
}) {
  try {
    // We normalize the pseudo-email to lowercase.
    const email = `${data.employee_id.trim().toLowerCase()}@tpas.internal`;
    
    // Generate a secure temporary password (e.g., TPAS-XXXXXX)
    const randomChars = Math.random().toString(36).substring(2, 8).toUpperCase();
    const temporaryPassword = `TPAS-${randomChars}`;

    // 1. Create Firebase Auth User
    const userRecord = await adminAuth.createUser({
      email,
      password: temporaryPassword,
      displayName: data.name,
    });

    const uid = userRecord.uid;

    // 2. Create Member document and dependencies
    try {
      await adminDb.collection('members').doc(uid).set({
        employee_id: data.employee_id,
        name: data.name,
        phone: data.phone,
        email: data.email,
        role: data.role,
        division: data.division,
        sub_division: data.sub_division,
        joining_date: data.joining_date,
        status: data.status,
        created_at: new Date().toISOString(),
      });

      // 3. Create initial pending donation
      await adminDb.collection('donations').add({
        member_id: uid,
        year: new Date().getFullYear(),
        amount: 500,
        status: 'pending',
        created_at: new Date().toISOString(),
      });

      // 4. Log activity
      await adminDb.collection('activity_logs').add({
        member_id: data.adminUid,
        action: 'ADD_MEMBER',
        details: `Added new member: ${data.name} (${data.employee_id})`,
        created_at: new Date().toISOString(),
      });

      return { success: true, uid, temporaryPassword };
    } catch (dbError: any) {
      // Rollback: Delete the auth user if Firestore fails
      console.error('Firestore creation failed, rolling back Auth user:', dbError);
      try {
        await adminAuth.deleteUser(uid);
      } catch (rollbackError) {
        console.error('CRITICAL: Failed to rollback Auth user after DB failure:', rollbackError);
      }
      return { success: false, error: 'Database error. Account creation was rolled back.' };
    }
  } catch (error: any) {
    console.error('Error creating user:', error);
    return { success: false, error: error.message };
  }
}

export async function resetFirebaseUserPasswordAction(uid: string, newPassword: string, adminUid: string, memberName: string) {
  try {
    await adminAuth.updateUser(uid, { password: newPassword });
    
    await adminDb.collection('activity_logs').add({
      member_id: adminUid,
      action: 'RESET_PASSWORD',
      details: `Reset password for: ${memberName}`,
      created_at: new Date().toISOString(),
    });
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
