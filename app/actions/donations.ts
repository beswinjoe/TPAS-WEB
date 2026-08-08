'use server';

import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { DONATION_STATUS, CAN_MANAGE_DONATIONS } from '@/lib/constants';
import type { Role } from '@/types';
import { generateReceiptNumber } from '@/lib/utils';

// We initialize a Supabase client that can be used on the server
// Note: It's fine to use anon key here since RLS is disabled in the schema,
// the security enforcement happens right here in these Server Actions.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Helper to get the currently authenticated member from the cookie
 */
async function getAuthenticatedMember() {
  const cookieStore = await cookies();
  const memberId = cookieStore.get('tpas_member_id')?.value;
  
  if (!memberId) return null;

  const { data: member } = await supabase
    .from('members')
    .select('*')
    .eq('id', memberId)
    .single();
    
  return member || null;
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

  // Ensure they own the donation
  const { data: donation } = await supabase.from('donations').select('*').eq('id', donationId).single();
  if (!donation || donation.member_id !== member.id) {
    return { error: 'Unauthorized to report payment for this donation' };
  }
  
  if (donation.status !== DONATION_STATUS.PENDING && donation.status !== DONATION_STATUS.OVERDUE && donation.status !== DONATION_STATUS.REJECTED) {
    return { error: 'Donation is not in a state to report payment.' };
  }

  const description = payload.notes 
    ? `${payload.existingDescription || ''}\nMember Notes: ${payload.notes}` 
    : payload.existingDescription;

  const { error } = await supabase.from('donations').update({
    status: DONATION_STATUS.PAYMENT_REPORTED,
    payment_date: payload.date,
    payment_method: payload.method,
    transaction_reference: payload.reference,
    payment_proof_url: payload.proof,
    description,
    reported_at: new Date().toISOString(),
    reported_by: member.id
  }).eq('id', donationId);

  if (error) return { error: error.message };

  await supabase.from('activity_logs').insert({ 
    member_id: member.id, 
    action: 'REPORT_PAYMENT', 
    details: `Payment reported for ${payload.title || payload.year}` 
  });

  return { success: true };
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

  const { data: donation } = await supabase
    .from('donations')
    .select('*, member:members!member_id(name, employee_id)')
    .eq('id', donationId)
    .single();

  if (!donation) return { error: 'Donation not found' };

  const receipt_number = generateReceiptNumber(donation.member_id, donation.year);
  
  const { error } = await supabase.from('donations').update({
    status: DONATION_STATUS.PAID,
    receipt_number,
    verified_by: member.id,
    verified_at: new Date().toISOString()
  }).eq('id', donationId);

  if (error) return { error: error.message };

  await supabase.from('activity_logs').insert({ 
    member_id: member.id, 
    action: 'VERIFY_PAYMENT', 
    details: `Payment confirmed for ${(donation as any).member?.name} (${(donation as any).member?.employee_id})` 
  });

  return { success: true };
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

  const { data: donation } = await supabase
    .from('donations')
    .select('*, member:members!member_id(name)')
    .eq('id', donationId)
    .single();

  if (!donation) return { error: 'Donation not found' };

  const { error } = await supabase.from('donations').update({
    status: DONATION_STATUS.REJECTED,
    rejection_reason: reason.trim(),
    rejected_by: member.id,
    rejected_at: new Date().toISOString()
  }).eq('id', donationId);

  if (error) return { error: error.message };

  await supabase.from('activity_logs').insert({ 
    member_id: member.id, 
    action: 'REJECT_PAYMENT', 
    details: `Payment rejected for ${(donation as any).member?.name}. Reason: ${reason}` 
  });

  return { success: true };
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

  const { error } = await supabase.from('donations').insert({
    member_id: payload.member_id,
    year: payload.year,
    amount: payload.amount,
    title: payload.title,
    description: payload.description,
    due_date: payload.due_date,
    status: DONATION_STATUS.PENDING,
    created_by: member.id
  });

  if (error) return { error: error.message };

  await supabase.from('activity_logs').insert({ 
    member_id: member.id, 
    action: 'CREATE_DONATION', 
    details: `Created donation request: ${payload.title}` 
  });

  return { success: true };
}
