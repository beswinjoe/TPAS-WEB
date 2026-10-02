import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
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
}

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY,
    }),
  });
}

const db = getFirestore();

async function seedDonations() {
  try {
    const membersSnap = await db.collection('members').limit(1).get();
    if (membersSnap.empty) {
      console.log('No members found. Please add a member first.');
      process.exit(1);
    }
    
    const memberId = membersSnap.docs[0].id;
    console.log(`Creating donations for member: ${memberId}`);

    const donations = [
      {
        member_id: memberId,
        year: 2026,
        title: 'Q1 Maintenance Fee',
        amount: 500,
        status: 'paid',
        payment_date: new Date().toISOString(),
        payment_method: 'Cash',
      },
      {
        member_id: memberId,
        year: 2026,
        title: 'Q2 Maintenance Fee',
        amount: 500,
        status: 'paid',
        payment_date: new Date().toISOString(),
        payment_method: 'Bank Transfer',
      },
      {
        member_id: memberId,
        year: 2026,
        title: 'Annual Event Fund',
        amount: 1000,
        status: 'pending',
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        member_id: memberId,
        year: 2026,
        title: 'Special Relief Fund',
        amount: 250,
        status: 'pending',
        due_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      }
    ];

    for (const d of donations) {
      await db.collection('donations').add(d);
      console.log(`Created donation: ${d.title} (${d.status})`);
    }

    console.log('Successfully seeded 4 donations.');
  } catch (err) {
    console.error('Error seeding donations:', err);
  }
}

seedDonations();
