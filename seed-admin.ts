import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envStr = fs.readFileSync(envPath, 'utf8');
envStr.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)="?(.*?)"?$/);
  if (match) {
    if (match[1] === 'FIREBASE_PRIVATE_KEY') {
       let key = match[2];
       if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
         key = key.substring(1, key.length - 1);
       }
       key = key.replace(/\\n/g, '\n').replace(/\\r\\n/g, '\n').replace(/\r\n/g, '\n').trim();
       process.env[match[1]] = key;
    } else {
       process.env[match[1]] = match[2];
    }
  }
});

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY,
    }),
  });
}

const adminAuth = getAuth();
const adminDb = getFirestore();

async function seedAdmin() {
  const email = 'admin_id@tpas.internal';
  let uid = '';
  
  try {
    const user = await adminAuth.getUserByEmail(email);
    uid = user.uid;
    console.log('Admin user found in Auth:', uid);
  } catch (e: any) {
    if (e.code === 'auth/user-not-found') {
      const user = await adminAuth.createUser({
        email,
        password: 'admin123',
        displayName: 'System Admin',
      });
      uid = user.uid;
      console.log('Admin user created in Auth:', uid);
    } else {
      throw e;
    }
  }

  const docRef = adminDb.collection('members').doc(uid);
  const docSnap = await docRef.get();
  
  if (!docSnap.exists) {
    await docRef.set({
      employee_id: 'ADMIN@ID',
      name: 'System Admin',
      role: 'Admin',
      status: 'Active',
      division: 'Headquarters',
      joining_date: new Date().toISOString(),
      created_at: new Date().toISOString()
    });
    console.log('Admin member document created in Firestore');
  } else {
    console.log('Admin member document already exists in Firestore');
  }
}

seedAdmin().then(() => {
  console.log('Done');
  process.exit(0);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
