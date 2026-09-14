'use server';

import { cookies } from 'next/headers';
import { DONATION_STATUS, CAN_MANAGE_DONATIONS } from '@/lib/constants';
import type { Role } from '@/types';
import { generateReceiptNumber } from '@/lib/utils';
import { adminDb } from '@/lib/firebase/server';

/**
 * Helper to get the currently authenticated member from the cookie
 */
async function getAuthenticatedMember() {
  const cookieStore = await cookies();
  const memberId = cookieStore.get('tpas_member_id')?.value;
  
  if (!memberId) return null;

  try {
    const docSnap = await adminDb.collection('members').doc(memberId).get();
    if (!docSnap.exists) return null;
    
    return { id: docSnap.id, ...docSnap.data() } as any;
  } catch (e) {
    return null;
  }
}

/**
 * Checks if the user is authorized to manage donations
 */
function isAuthorizedToManage(role?: Role | null) {
  return role && CAN_MANAGE_DONATIONS.includes(role);
}

/**
 * Reports a payment (Member side)
 */
export async function reportPayment(donationId: string, payload: {
  date: string;
  method: string;
  reference: string;
  proof: string;
  notes: string;
  existingDescription: string;
  title: string;
  year: number;
}) {
  const member = await getAuthenticatedMember();
  if (!member) return { error: 'Not authenticated' };

  try {
    const donationRef = adminDb.collection('donations').doc(donationId);
    const donationSnap = await donationRef.get();
    
    if (!donationSnap.exists) return { error: 'Donation not found' };
    const donation = donationSnap.data();

    if (!donation || donation.member_id !== member.id) {
      return { error: 'Unauthorized to report payment for this donation' };
    }
    
    if (donation.status !== DONATION_STATUS.PENDING && donation.status !== DONATION_STATUS.OVERDUE && donation.status !== DONATION_STATUS.REJECTED) {
      return { error: 'Donation is not in a state to report payment.' };
    }

    const description = payload.notes 
      ? `${payload.existingDescription || ''}\nMember Notes: ${payload.notes}` 
      : payload.existingDescription;

    await donationRef.update({
      status: DONATION_STATUS.PAYMENT_REPORTED,
      payment_date: payload.date,
      payment_method: payload.method,
      transaction_reference: payload.reference,
      payment_proof_url: payload.proof,
      description,
      reported_at: new Date().toISOString(),
      reported_by: member.id
    });

    await adminDb.collection('activity_logs').add({ 
      member_id: member.id, 
      action: 'REPORT_PAYMENT', 
      details: `Payment reported for ${payload.title || payload.year}`,
      created_at: new Date().toISOString()
    });

    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * Confirms a payment (Admin/President/Treasurer side)
 */
export async function confirmPayment(donationId: string) {
  const member = await getAuthenticatedMember();
  if (!member) return { error: 'Not authenticated' };
  if (!isAuthorizedToManage(member.role as Role)) {
    return { error: 'Forbidden. You do not have verification permissions.' };
  }

  try {
    const donationRef = adminDb.collection('donations').doc(donationId);
    const donationSnap = await donationRef.get();

    if (!donationSnap.exists) return { error: 'Donation not found' };
    const donation = donationSnap.data() as any;

    const receipt_number = generateReceiptNumber(donation.member_id, donation.year);
    
    await donationRef.update({
      status: DONATION_STATUS.PAID,
      receipt_number,
      verified_by: member.id,
      verified_at: new Date().toISOString()
    });

    const memberSnap = await adminDb.collection('members').doc(donation.member_id).get();
    const donorName = memberSnap.exists ? memberSnap.data()?.name : 'Unknown Member';
    const donorId = memberSnap.exists ? memberSnap.data()?.employee_id : 'Unknown ID';

    await adminDb.collection('activity_logs').add({ 
      member_id: member.id, 
      action: 'VERIFY_PAYMENT', 
      details: `Payment confirmed for ${donorName} (${donorId})`,
      created_at: new Date().toISOString()
    });

    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * Rejects a payment (Admin/President/Treasurer side)
 */
export async function rejectPayment(donationId: string, reason: string) {
  const member = await getAuthenticatedMember();
  if (!member) return { error: 'Not authenticated' };
  if (!isAuthorizedToManage(member.role as Role)) {
    return { error: 'Forbidden. You do not have verification permissions.' };
  }

  try {
    const donationRef = adminDb.collection('donations').doc(donationId);
    const donationSnap = await donationRef.get();

    if (!donationSnap.exists) return { error: 'Donation not found' };
    const donation = donationSnap.data() as any;

    await donationRef.update({
      status: DONATION_STATUS.REJECTED,
      rejection_reason: reason.trim(),
      rejected_by: member.id,
      rejected_at: new Date().toISOString()
    });

    const memberSnap = await adminDb.collection('members').doc(donation.member_id).get();
    const donorName = memberSnap.exists ? memberSnap.data()?.name : 'Unknown Member';

    await adminDb.collection('activity_logs').add({ 
      member_id: member.id, 
      action: 'REJECT_PAYMENT', 
      details: `Payment rejected for ${donorName}. Reason: ${reason}`,
      created_at: new Date().toISOString()
    });

    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * Creates a new donation request (Admin/President/Treasurer side)
 */
export async function createDonationRequest(payload: {
  member_id: string;
  year: number;
  amount: number;
  title: string;
  description: string;
  due_date: string;
}) {
  const member = await getAuthenticatedMember();
  if (!member) return { error: 'Not authenticated' };
  if (!isAuthorizedToManage(member.role as Role)) {
    return { error: 'Forbidden. You do not have management permissions.' };
  }

  try {
    await adminDb.collection('donations').add({
      member_id: payload.member_id,
      year: payload.year,
      amount: payload.amount,
      title: payload.title,
      description: payload.description,
      due_date: payload.due_date,
      status: DONATION_STATUS.PENDING,
      created_by: member.id,
      created_at: new Date().toISOString()
    });

    await adminDb.collection('activity_logs').add({ 
      member_id: member.id, 
      action: 'CREATE_DONATION', 
      details: `Created donation request: ${payload.title}`,
      created_at: new Date().toISOString()
    });

    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
