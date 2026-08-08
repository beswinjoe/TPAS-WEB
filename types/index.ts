export type Role = 'President' | 'Secretary' | 'Treasurer' | 'Member' | 'Admin';
export type MemberStatus = 'Active' | 'Inactive' | 'Pending';
export type DonationStatus = 'pending' | 'payment_reported' | 'paid' | 'rejected' | 'overdue';
export type DocumentCategory = 'Membership Forms' | 'Meeting Minutes' | 'Rules' | 'Annual Reports' | 'Circulars';
export type AnnouncementCategory = 'General' | 'Important' | 'Event' | 'Finance' | 'Circular';

export interface Member {
  id: string;
  employee_id: string;
  name: string;
  photo_url?: string;
  phone?: string;
  email?: string;
  role: Role;
  division_id?: string;
  sub_division_id?: string;
  division?: string; // deprecated, keeping for fallback during migration
  sub_division?: string; // deprecated
  division_ref?: Division;
  sub_division_ref?: SubDivision;
  joining_date?: string;
  status: MemberStatus;
  created_at: string;
}

export interface Donation {
  id: string;
  member_id: string;
  year: number;
  title?: string;
  description?: string;
  amount: number;
  due_date?: string;
  status: DonationStatus;
  payment_date?: string;
  payment_method?: string;
  transaction_reference?: string;
  payment_proof_url?: string;
  receipt_number?: string;
  created_by?: string;
  reported_by?: string;
  reported_at?: string;
  verified_by?: string;
  verified_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  rejection_reason?: string;
  member?: Member;
  verifier?: Member;
  rejecter?: Member;
}

export interface Promotion {
  id: string;
  member_id: string;
  old_role: Role;
  new_role: Role;
  promotion_date: string;
  approved_by: string;
  member?: Member;
  approver?: Member;
}

export interface Announcement {
  id: string;
  title: string;
  description: string;
  category: AnnouncementCategory;
  posted_by: string;
  date: string;
  attachments?: string[];
  poster?: Member;
}

export interface Event {
  id: string;
  title: string;
  venue: string;
  description: string;
  date: string;
  time: string;
  rsvps?: string[];
}

export interface Document {
  id: string;
  title: string;
  category: DocumentCategory;
  file_url: string;
  uploaded_by: string;
  created_at: string;
  uploader?: Member;
}

export interface SubDivision {
  id: string;
  division_id: string;
  name: string;
  active: boolean;
  coordinator_id?: string;
  created_at: string;
  coordinator?: Member;
}

export interface Division {
  id: string;
  name: string;
  state: string;
  active: boolean;
  president_id?: string;
  secretary_id?: string;
  treasurer_id?: string;
  created_at: string;
  president?: Member;
  secretary?: Member;
  treasurer?: Member;
  sub_divisions?: SubDivision[]; // Replaces string[]
}

export interface ActivityLog {
  id: string;
  member_id: string;
  action: string;
  details: string;
  created_at: string;
  member?: Member;
}

export interface DashboardStats {
  total_members: number;
  paid_members: number;
  pending_donations: number;
  total_divisions: number;
  total_events: number;
  active_members: number;
}
