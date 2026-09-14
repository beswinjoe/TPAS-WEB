import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

function initFirebaseAdmin() {
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

// Export getter functions to prevent module-level crashes during Server Action loading
export const getAdminAuth = () => {
  initFirebaseAdmin();
  return getAuth();
};

export const getAdminDb = () => {
  initFirebaseAdmin();
  return getFirestore();
};

export const getAdminStorage = () => {
  initFirebaseAdmin();
  return getStorage();
};
