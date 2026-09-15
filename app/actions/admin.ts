'use server';

export async function createFirebaseUserAction(data: any) {
  console.error('[TPAS ACTION] REACHED');
  console.error('[TPAS ACTION] employee:', data.employee_id);
  
  return {
    success: false,
    error: 'PURE_SERVER_ACTION_SUCCESS'
  };
}

export async function resetFirebaseUserPasswordAction(uid: string, newPassword: string, adminUid: string, memberName: string) {
  return {
    success: false,
    error: 'PURE_SERVER_ACTION_RESET'
  };
}
