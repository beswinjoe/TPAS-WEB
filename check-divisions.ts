import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';

let app;
if (!getApps().length) {
  // If there's a service account JSON we can use it, but maybe we can just connect locally.
  // Actually, we need credentials for Admin SDK.
}
