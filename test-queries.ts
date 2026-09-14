import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, getDoc, getCountFromServer, query, orderBy, limit, where } from 'firebase/firestore';
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

async function testQueries() {
  console.log('Logging in...');
  const cred = await signInWithEmailAndPassword(auth, 'admin_id@tpas.internal', 'admin123');
  const memberId = cred.user.uid;
  console.log('Logged in as:', memberId);

  const currentYear = new Date().getFullYear();
  const today = new Date().toISOString().split('T')[0];
  const startOfYear = `${currentYear}-01-01`;

  try {
    console.log('Testing donations query...');
    await getDocs(query(collection(db, 'donations'), where('year', '==', currentYear)));
    console.log('✅ donations query passed');
  } catch (e: any) { console.error('❌ donations:', e.message); }

  try {
    console.log('Testing events query...');
    await getCountFromServer(query(collection(db, 'events'), where('date', '>=', today)));
    console.log('✅ events query passed');
  } catch (e: any) { console.error('❌ events:', e.message); }

  try {
    console.log('Testing activity logs login query...');
    await getDocs(query(collection(db, 'activity_logs'), where('member_id', '==', memberId), where('action', '==', 'LOGIN'), orderBy('created_at', 'desc'), limit(2)));
    console.log('✅ activity logs query passed');
  } catch (e: any) { console.error('❌ activity logs:', e.message); }

  try {
    console.log('Testing donations member year query...');
    await getDocs(query(collection(db, 'donations'), where('member_id', '==', memberId), where('year', '==', currentYear), limit(1)));
    console.log('✅ donations member query passed');
  } catch (e: any) { console.error('❌ donations member query:', e.message); }
}

testQueries().then(() => process.exit(0));
