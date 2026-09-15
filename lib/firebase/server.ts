function normalizePrivateKey(key: string | undefined): string {
  if (!key) throw new Error('Firebase Admin initialization failed: FIREBASE_PRIVATE_KEY is missing');
  
  let normalized = key;
  
  // Remove accidental surrounding quotes
  if ((normalized.startsWith('"') && normalized.endsWith('"')) || 
      (normalized.startsWith("'") && normalized.endsWith("'"))) {
    normalized = normalized.substring(1, normalized.length - 1);
  }
  
  // Handle escaped newlines
  normalized = normalized.replace(/\\n/g, '\n').replace(/\\r\\n/g, '\n');
  
  // Normalize CRLF to LF
  normalized = normalized.replace(/\r\n/g, '\n');
  
  // Trim surrounding whitespace but not internal
  normalized = normalized.trim();
  
  // Validate PEM structure
  if (!normalized.includes('-----BEGIN PRIVATE KEY-----') || !normalized.includes('-----END PRIVATE KEY-----')) {
    throw new Error('Firebase Admin initialization failed: FIREBASE_PRIVATE_KEY is not a valid PEM private key');
  }
  
  return normalized;
}

async function getFirebaseAdminApp() {
  const { getApps, initializeApp, cert, getApp } = await import('firebase-admin/app');
  
  if (getApps().length > 0) {
    return getApp();
  }

  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL) {
    throw new Error('Firebase Admin initialization failed: FIREBASE_PROJECT_ID or FIREBASE_CLIENT_EMAIL is missing');
  }
  
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
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
