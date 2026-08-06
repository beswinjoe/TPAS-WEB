export type Role = 'President' | 'Secretary' | 'Treasurer' | 'Member' | 'Admin';
export type MemberStatus = 'Active' | 'Inactive' | 'Pending';
export type DonationStatus = 'Paid' | 'Pending';
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
  division?: string;
  sub_division?: string;
  joining_date?: string;
  status: MemberStatus;
  created_at: string;
}

export interface Donation {
  id: string;
  member_id: string;
  year: number;
  amount: number;
  status: DonationStatus;
  payment_date?: string;
  receipt_number?: string;
  member?: Member;
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

export interface Division {
  id: string;
  name: string;
  sub_divisions: string[];
  head_member_id?: string;
  head?: Member;
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
