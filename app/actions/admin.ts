'use server';

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export async function createFirebaseUserAction(data: any) {
  try {
    console.error('[TPAS] before getApps');
    const apps = getApps();
    console.error('[TPAS] getApps succeeded:', apps.length);

    console.error('[TPAS ADMIN DEBUG]', {
      projectId: process.env.FIREBASE_PROJECT_ID || null,
      hasClientEmail: Boolean(process.env.FIREBASE_CLIENT_EMAIL),
      clientEmailLength: process.env.FIREBASE_CLIENT_EMAIL?.length ?? 0,
      hasPrivateKey: Boolean(process.env.FIREBASE_PRIVATE_KEY),
      privateKeyLength: process.env.FIREBASE_PRIVATE_KEY?.length ?? 0,
      privateKeyStartsWithBegin: process.env.FIREBASE_PRIVATE_KEY?.includes('BEGIN PRIVATE KEY'),
      privateKeyHasEscapedNewlines: process.env.FIREBASE_PRIVATE_KEY?.includes('\\n'),
      privateKeyHasActualNewlines: process.env.FIREBASE_PRIVATE_KEY?.includes('\n'),
    });

    console.error('[TPAS] before init');

    const app = initializeApp(
      {
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID!,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
          privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        }),
      },
      'tpas-debug-' + Date.now()
    );

    console.error('[TPAS] init succeeded:', app.name);

    const auth = getAuth(app);

    console.error('[TPAS] getAuth succeeded');

    return {
      success: false,
      error: 'TEST_DIRECT_INIT_SUCCESS'
    };
  } catch (error: unknown) {
    console.error('[TPAS] FIREBASE ADMIN TEST FAILED');

    if (error instanceof Error) {
      console.error('[TPAS] name:', error.name);
      console.error('[TPAS] message:', error.message);
      console.error('[TPAS] stack:', error.stack);
    } else {
      console.error('[TPAS] unknown error:', error);
    }

    return {
      success: false,
      error: error instanceof Error
        ? `${error.name}: ${error.message}`
        : 'Unknown Firebase Admin error'
    };
  }
}

export async function resetFirebaseUserPasswordAction(uid: string, newPassword: string, adminUid: string, memberName: string) {
  return {
    success: false,
    error: 'SERVER_ACTION_TEST_RESET'
  };
}
