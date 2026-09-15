'use server';

import { getAdminAuth, getAdminDb } from '@/lib/firebase/server';

const ADMIN_ROLE = 'Admin';

type AdminActionResult =
  | { success: true; uid: string }
  | { success: false; error: string };

type CreateMemberData = {
  employee_id: string;
  name: string;
  phone?: string;
  email?: string;
  role: string;
  division?: string | null;
  sub_division?: string | null;
  joining_date?: string;
  status?: string;
  password?: string;
  adminUid?: string;
};

async function assertAdmin(adminUid?: string) {
  if (!adminUid) throw new Error('Admin session is required.');

  const db = getAdminDb();
  const adminSnap = await db.collection('members').doc(adminUid).get();
  if (!adminSnap.exists) throw new Error('Admin profile not found.');

  const admin = adminSnap.data() as { role?: string; status?: string };
  if (admin.role !== ADMIN_ROLE || admin.status !== 'Active') {
    throw new Error('Admin authorization required.');
  }

  const auth = getAdminAuth();
  const authUser = await auth.getUser(adminUid);
  if (authUser.disabled) throw new Error('Admin account is disabled.');

  return { db, auth };
}

export async function createFirebaseUserAction(data: CreateMemberData): Promise<AdminActionResult> {
  try {
    const { db, auth } = await assertAdmin(data.adminUid);

    const employeeId = data.employee_id.trim();
    const name = data.name.trim();
    const password = data.password?.trim() ?? '';
    const email = data.email?.trim().toLowerCase() || `${employeeId.toLowerCase()}@tpas.internal`;

    if (!employeeId || !name) return { success: false, error: 'Employee ID and Name are required.' };
    if (!/^[A-Za-z0-9@$&_#-]+$/.test(employeeId)) return { success: false, error: 'Employee ID contains invalid characters.' };
    if (password.length < 8) return { success: false, error: 'Password must be at least 8 characters long.' };
    if (data.email && !/^\S+@\S+\.\S+$/.test(email)) return { success: false, error: 'Please enter a valid email address.' };

    const duplicate = await db.collection('members').where('employee_id', '==', employeeId).limit(1).get();
    if (!duplicate.empty) return { success: false, error: 'This Employee ID is already in use.' };

    let userRecord: Awaited<ReturnType<typeof auth.createUser>> | undefined;
    try {
      userRecord = await auth.createUser({ email, password, displayName: name });
      const uid = userRecord.uid;
      const now = new Date().toISOString();

      await db.collection('members').doc(uid).set({
        employee_id: employeeId,
        name,
        phone: data.phone?.trim() || null,
        email,
        role: data.role,
        division: data.division || null,
        sub_division: data.sub_division || null,
        joining_date: data.joining_date || null,
        status: data.status || 'Active',
        created_at: now,
      });

      await db.collection('activity_logs').add({
        member_id: data.adminUid,
        action: 'ADD_MEMBER',
        details: `Added member: ${name} (${employeeId})`,
        created_at: now,
      });

      return { success: true, uid };
    } catch (error) {
      if (userRecord?.uid) {
        try { await auth.deleteUser(userRecord.uid); }
        catch (rollbackError) { console.error('[TPAS] Auth rollback failed:', rollbackError); }
      }
      throw error;
    }
  } catch (error) {
    console.error('[TPAS] createFirebaseUserAction failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create member.' };
  }
}

export async function resetFirebaseUserPasswordAction(
  uid: string,
  newPassword: string,
  adminUid: string,
  memberName: string,
): Promise<AdminActionResult> {
  try {
    const { db, auth } = await assertAdmin(adminUid);
    const password = newPassword.trim();
    if (password.length < 8) return { success: false, error: 'Password must be at least 8 characters long.' };

    await auth.updateUser(uid, { password });
    await db.collection('activity_logs').add({
      member_id: adminUid,
      action: 'RESET_MEMBER_PASSWORD',
      details: `Reset password for member: ${memberName}`,
      created_at: new Date().toISOString(),
    });

    return { success: true, uid };
  } catch (error) {
    console.error('[TPAS] resetFirebaseUserPasswordAction failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update password.' };
  }
}
