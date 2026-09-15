async function getFirebaseAdminApp() {
  const { getApps, initializeApp, cert, getApp } = await import('firebase-admin/app');
  
  if (getApps().length > 0) {
    return getApp();
  }

  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
    throw new Error('Firebase Admin environment variables are missing.');
  }

  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

export async function getAdminAuth() {
  await getFirebaseAdminApp();
  const { getAuth } = await import('firebase-admin/auth');
  return getAuth();
}

export async function getAdminDb() {
  await getFirebaseAdminApp();
  const { getFirestore } = await import('firebase-admin/firestore');
  return getFirestore();
}

export async function getAdminStorage() {
  await getFirebaseAdminApp();
  const { getStorage } = await import('firebase-admin/storage');
  return getStorage();
}
