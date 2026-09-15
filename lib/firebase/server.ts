function normalizePrivateKey(key: string | undefined, sourceName: string): string {
  if (!key) throw new Error(`Firebase Admin initialization failed: ${sourceName} is missing`);
  
  let normalized = key;
  
  // Safely parse if it's a JSON string to handle escape characters perfectly
  if ((normalized.startsWith('"') && normalized.endsWith('"')) || 
      (normalized.startsWith("'") && normalized.endsWith("'"))) {
    try {
      normalized = JSON.parse(normalized);
    } catch {
      normalized = normalized.substring(1, normalized.length - 1);
    }
  }
  
  // Handle literal escaped newlines that might survive JSON parsing
  normalized = normalized.replace(/\\\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\r\\n/g, '\n');
  
  // Normalize CRLF to LF
  normalized = normalized.replace(/\r\n/g, '\n');
  
  // Trim surrounding whitespace but not internal
  normalized = normalized.trim();
  
  // Validate PEM structure
  if (!normalized.includes('-----BEGIN PRIVATE KEY-----') && !normalized.includes('-----BEGIN RSA PRIVATE KEY-----')) {
    throw new Error(`Firebase Admin initialization failed: ${sourceName} is not a valid PEM private key`);
  }
  
  return normalized;
}

async function getFirebaseAdminApp() {
  const { getApps, initializeApp, cert, getApp } = await import('firebase-admin/app');
  
  if (getApps().length > 0) {
    return getApp();
  }

  let projectId = process.env.FIREBASE_PROJECT_ID;
  let clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
  let sourceName = 'FIREBASE_PRIVATE_KEY';

  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    try {
      const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
      const json = JSON.parse(decoded);
      projectId = json.project_id || projectId;
      clientEmail = json.client_email || clientEmail;
      privateKeyRaw = json.private_key;
      sourceName = 'FIREBASE_SERVICE_ACCOUNT_BASE64';
    } catch {
      throw new Error('Firebase Admin initialization failed: FIREBASE_SERVICE_ACCOUNT_BASE64 contains invalid JSON');
    }
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      const json = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      projectId = json.project_id || projectId;
      clientEmail = json.client_email || clientEmail;
      privateKeyRaw = json.private_key;
      sourceName = 'FIREBASE_SERVICE_ACCOUNT_JSON';
    } catch {
      throw new Error('Firebase Admin initialization failed: FIREBASE_SERVICE_ACCOUNT_JSON contains invalid JSON');
    }
  }

  if (!projectId || !clientEmail) {
    throw new Error(`Firebase Admin initialization failed: Project ID or Client Email is missing from ${sourceName} or environment variables`);
  }
  
  const privateKey = normalizePrivateKey(privateKeyRaw, sourceName);

  try {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } catch (error) {
    throw new Error('Firebase Admin initialization failed: invalid Firebase service-account credentials');
  }
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
