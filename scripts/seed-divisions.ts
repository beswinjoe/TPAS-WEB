import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';


// Initialize Firebase Admin (Requires Service Account Key)
// Note: Ensure FIREBASE_SERVICE_ACCOUNT_KEY env var is set or provide path to serviceAccountKey.json
if (!getApps().length) {
  // Try to use application default credentials or a service account path if provided.
  // For standard Vercel / Next.js Admin SDK, usually we parse a JSON string from env.
  // We'll assume the project has some way to init admin SDK.
  
  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountEnv) {
    const serviceAccount = JSON.parse(serviceAccountEnv);
    initializeApp({
      credential: cert(serviceAccount)
    });
  } else {
    // Fallback: Initialize without credentials (works in some GCP environments, otherwise fails)
    initializeApp();
  }
}

const db = getFirestore();

// Safe TPAS seed data
const DIVISIONS = [
  { name: 'Nagercoil' },
  { name: 'Thuckalay' },
  { name: 'Marthandam' }
];

const SUB_DIVISIONS = [
  { name: 'Nagercoil Town', divisionName: 'Nagercoil' },
  { name: 'Kanyakumari', divisionName: 'Nagercoil' },
  { name: 'Thuckalay Town', divisionName: 'Thuckalay' },
  { name: 'Colachel', divisionName: 'Thuckalay' },
  { name: 'Marthandam Town', divisionName: 'Marthandam' },
  { name: 'Kuzhithurai', divisionName: 'Marthandam' }
];

async function seed() {
  console.log('Seeding Divisions...');
  const divMap = new Map();

  for (const div of DIVISIONS) {
    // Check if exists
    const existing = await db.collection('divisions').where('name', '==', div.name).get();
    let docRef;
    if (existing.empty) {
      docRef = await db.collection('divisions').add(div);
      console.log(`Created Division: ${div.name}`);
    } else {
      docRef = existing.docs[0].ref;
      console.log(`Division already exists: ${div.name}`);
    }
    divMap.set(div.name, docRef.id);
  }

  console.log('\nSeeding Sub-Divisions...');
  for (const sub of SUB_DIVISIONS) {
    const divId = divMap.get(sub.divisionName);
    if (!divId) {
      console.error(`Division ID not found for ${sub.divisionName}`);
      continue;
    }

    const subData = { name: sub.name, division_id: divId };
    
    // Check if exists
    const existing = await db.collection('sub_divisions').where('name', '==', sub.name).where('division_id', '==', divId).get();
    if (existing.empty) {
      await db.collection('sub_divisions').add(subData);
      console.log(`Created Sub-Division: ${sub.name}`);
    } else {
      console.log(`Sub-Division already exists: ${sub.name}`);
    }
  }

  console.log('\nSeeding complete.');
  process.exit(0);
}

seed().catch(console.error);
