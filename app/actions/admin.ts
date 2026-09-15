'use server';

import type { Role } from '@/types';

export async function createFirebaseUserAction(data: any) {
  console.error('[TPAS DEBUG] TYPE IMPORT TEST');

  return {
    success: false,
    error: 'TYPE_IMPORT_SUCCESS'
  };
}

export async function resetFirebaseUserPasswordAction(uid: string, newPassword: string, adminUid: string, memberName: string) {
  return {
    success: false,
    error: 'TYPE_IMPORT_SUCCESS'
  };
}
