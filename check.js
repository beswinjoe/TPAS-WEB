import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const divSnap = await getDocs(collection(db, 'divisions'));
  console.log('Divisions count:', divSnap.size);
  divSnap.forEach(d => console.log('Division:', d.id, d.data()));
  
  const subSnap = await getDocs(collection(db, 'sub_divisions'));
  console.log('Sub Divisions count:', subSnap.size);
  subSnap.forEach(d => console.log('Sub Division:', d.id, d.data()));
  process.exit(0);
}
check();
