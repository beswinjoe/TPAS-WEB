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

async function audit() {
  const authUsers = [];
  let pageToken;
  do {
    const list = await adminAuth.listUsers(1000, pageToken);
    authUsers.push(...list.users);
    pageToken = list.pageToken;
  } while (pageToken);

  console.log(`Firebase Auth Users: ${authUsers.length}`);

  const membersSnap = await adminDb.collection('members').get();
  console.log(`Firestore Members: ${membersSnap.docs.length}`);

  let linkedCount = 0;
  let unlinkedAuth = 0;
  let unlinkedFirestore = 0;

  for (const user of authUsers) {
    const doc = membersSnap.docs.find(d => d.id === user.uid);
    if (doc) linkedCount++;
    else unlinkedAuth++;
  }

  for (const doc of membersSnap.docs) {
    const user = authUsers.find(u => u.uid === doc.id);
    if (!user) unlinkedFirestore++;
  }

  console.log(`Linked accounts (Auth UID matches Firestore Document ID): ${linkedCount}`);
  console.log(`Auth users without Firestore profile: ${unlinkedAuth}`);
  console.log(`Firestore profiles without Auth user: ${unlinkedFirestore}`);
}

audit().then(() => process.exit(0)).catch(console.error);
