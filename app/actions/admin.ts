'use server';

import { getAdminAuth } from '@/lib/firebase/server';
import type { Role } from '@/types';

export async function createFirebaseUserAction(data: any) {
  try {
    console.error('[TPAS DEBUG] TEST 1: starting Firebase Admin Auth');

    const auth = getAdminAuth();

    console.error('[TPAS DEBUG] TEST 1: Firebase Admin Auth initialized');

    return {
      success: false,
      error: 'TEST_1_AUTH_SUCCESS'
    };
  } catch (error: any) {
    console.error('[TPAS DEBUG] TEST 1 FAILED:', error);

    return {
      success: false,
      error: error?.message || 'TEST_1_AUTH_FAILED'
    };
  }
}

export async function resetFirebaseUserPasswordAction(uid: string, newPassword: string, adminUid: string, memberName: string) {
  console.error('[TPAS TEST] resetFirebaseUserPasswordAction reached');

  return {
    success: false,
    error: 'SERVER_ACTION_TEST_RESET'
  };
}
