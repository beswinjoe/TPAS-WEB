import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, getDoc, getCountFromServer, query, orderBy, limit } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envStr = fs.readFileSync(envPath, 'utf8');
const env: Record<string, string> = {};
envStr.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)="?(.*?)"?$/);
  if (match) env[match[1]] = match[2];
});

const app = initializeApp({
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
});

const auth = getAuth(app);
const db = getFirestore(app);

async function testPermissions() {
  console.log('Logging in...');
  const cred = await signInWithEmailAndPassword(auth, 'admin_id@tpas.internal', 'admin123');
  console.log('Logged in as:', cred.user.uid);

  const collectionsToTest = [
    'members',
    'divisions',
    'sub_divisions',
    'donations',
    'activity_logs',
    'events',
    'announcements',
    'promotions',
    'documents'
  ];

  for (const col of collectionsToTest) {
    try {
      console.log(`Testing read access to '${col}'...`);
      await getDocs(query(collection(db, col), limit(1)));
      if (col === 'events' || col === 'members' || col === 'promotions') {
         await getCountFromServer(collection(db, col));
      }
      console.log(`✅ Success reading '${col}'`);
    } catch (e: any) {
      console.error(`❌ Failed reading '${col}':`, e.message);
    }
  }
}

testPermissions().then(() => process.exit(0));
