'use server';

export async function createFirebaseUserAction(data: any) {
  console.error('[TPAS TEST] createFirebaseUserAction reached');
  console.error('[TPAS TEST] keys:', Object.keys(data || {}));

  return {
    success: false,
    error: 'SERVER_ACTION_TEST'
  };
}

export async function resetFirebaseUserPasswordAction(uid: string, newPassword: string, adminUid: string, memberName: string) {
  console.error('[TPAS TEST] resetFirebaseUserPasswordAction reached');

  return {
    success: false,
    error: 'SERVER_ACTION_TEST_RESET'
  };
}
