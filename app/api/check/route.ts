import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { getAdminDb } from '@/lib/firebase/server';

const DEFAULT_DIVISIONS = [
  { id: 'div-nagercoil', name: 'Nagercoil' },
  { id: 'div-thuckalay', name: 'Thuckalay' },
  { id: 'div-kuzhithurai', name: 'Kuzhithurai' }
];

const DEFAULT_SUB_DIVISIONS = [
  // Nagercoil
  { id: 'sub-nagercoil-town', name: 'Nagercoil Town', division_id: 'div-nagercoil' },
  { id: 'sub-nagercoil-north', name: 'Nagercoil North', division_id: 'div-nagercoil' },
  { id: 'sub-nagercoil-south', name: 'Nagercoil South', division_id: 'div-nagercoil' },
  { id: 'sub-kanyakumari', name: 'Kanyakumari', division_id: 'div-nagercoil' },
  { id: 'sub-kottaram', name: 'Kottaram', division_id: 'div-nagercoil' },
  { id: 'sub-boothapandy', name: 'Boothapandy', division_id: 'div-nagercoil' },
  
  // Thuckalay
  { id: 'sub-thuckalay', name: 'Thuckalay', division_id: 'div-thuckalay' },
  { id: 'sub-eraniel', name: 'Eraniel', division_id: 'div-thuckalay' },
  { id: 'sub-colachel', name: 'Colachel', division_id: 'div-thuckalay' },
  { id: 'sub-kulasekharam', name: 'Kulasekharam', division_id: 'div-thuckalay' },
  
  // Kuzhithurai
  { id: 'sub-kuzhithurai', name: 'Kuzhithurai', division_id: 'div-kuzhithurai' },
  { id: 'sub-marthandam', name: 'Marthandam', division_id: 'div-kuzhithurai' },
  { id: 'sub-kaliyakkavilai', name: 'Kaliyakkavilai', division_id: 'div-kuzhithurai' },
  { id: 'sub-arumanai', name: 'Arumanai', division_id: 'div-kuzhithurai' }
];

export async function GET() {
  try {
    const db = await getAdminDb();
    
    // Check members
    const membersSnap = await db.collection('members').limit(1).get();
    
    // Check divisions
    const divSnap = await db.collection('divisions').limit(1).get();
    
    let seeded = false;
    let seededCount = { div: 0, sub: 0 };
    
    // Auto-seed TANGEDCO Kanyakumari EDC data if empty
    if (divSnap.empty) {
      console.log('No divisions found, initializing default TANGEDCO data...');
      
      const batch = db.batch();
      
      // Seed Divisions
      for (const div of DEFAULT_DIVISIONS) {
        const ref = db.collection('divisions').doc(div.id);
        batch.set(ref, {
          name: div.name,
          created_at: new Date().toISOString()
        });
        seededCount.div++;
      }
      
      // Seed Sub-Divisions
      for (const sub of DEFAULT_SUB_DIVISIONS) {
        const ref = db.collection('sub_divisions').doc(sub.id);
        batch.set(ref, {
          division_id: sub.division_id,
          name: sub.name,
          created_at: new Date().toISOString()
        });
        seededCount.sub++;
      }
      
      await batch.commit();
      seeded = true;
    }
    
    return NextResponse.json({
      status: 'ok',
      firebase: 'connected',
      collections: {
        members: {
          hasData: !membersSnap.empty
        },
        divisions: {
          hasData: !divSnap.empty || seeded,
          autoSeededJustNow: seeded,
          seededCount: seeded ? seededCount : undefined
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('API Check Error:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Database connection failed',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
