import { type Role } from '@/types';

export const ROLE_HIERARCHY: Record<Role, number> = {
  Member: 1,
  Treasurer: 2,
  Secretary: 3,
  President: 4,
  Admin: 5,
};

export const ROLE_COLORS: Record<Role, string> = {
  Member: 'bg-slate-100 text-slate-700',
  Treasurer: 'bg-amber-100 text-amber-700',
  Secretary: 'bg-blue-100 text-blue-700',
  President: 'bg-purple-100 text-purple-700',
  Admin: 'bg-red-100 text-red-700',
};

export const ROLE_BADGE_COLORS: Record<Role, string> = {
  Member: 'default',
  Treasurer: 'warning',
  Secretary: 'info',
  President: 'purple',
  Admin: 'destructive',
};

export const ALLOWED_ROUTES: Record<Role, string[]> = {
  Member: ['/dashboard', '/members', '/donations', '/payment-history', '/promotions', '/divisions', '/announcements', '/events', '/documents', '/digital-id', '/profile'],
  Treasurer: ['/dashboard', '/members', '/donations', '/payment-history', '/promotions', '/divisions', '/announcements', '/events', '/documents', '/digital-id', '/profile'],
  Secretary: ['/dashboard', '/members', '/donations', '/payment-history', '/promotions', '/divisions', '/announcements', '/events', '/documents', '/digital-id', '/profile'],
  President: ['/dashboard', '/members', '/donations', '/payment-history', '/promotions', '/divisions', '/announcements', '/events', '/documents', '/digital-id', '/profile'],
  Admin: ['/dashboard', '/members', '/donations', '/payment-history', '/promotions', '/divisions', '/announcements', '/events', '/documents', '/digital-id', '/profile', '/admin'],
};

export const CAN_CREATE_ANNOUNCEMENTS: Role[] = ['Admin', 'President', 'Secretary'];
export const CAN_MANAGE_EVENTS: Role[] = ['Admin', 'President', 'Secretary'];
export const CAN_MANAGE_DONATIONS: Role[] = ['Admin', 'Treasurer'];
export const CAN_EDIT_MEMBERS: Role[] = ['Admin'];
export const CAN_UPLOAD_DOCUMENTS: Role[] = ['Admin', 'Secretary'];

export const DIVISIONS = [
  'Kanniyakumari North',
  'Kanniyakumari South',
  'Nagercoil Division',
  'Thuckalay Division',
  'Colachel Division',
];

export const DONATION_AMOUNT = 500;
export const CURRENT_YEAR = new Date().getFullYear();

export const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard', roles: ['Member', 'Treasurer', 'Secretary', 'President', 'Admin'] },
  { label: 'Members', href: '/members', icon: 'Users', roles: ['Member', 'Treasurer', 'Secretary', 'President', 'Admin'] },
  { label: 'Donations', href: '/donations', icon: 'IndianRupee', roles: ['Member', 'Treasurer', 'Secretary', 'President', 'Admin'] },
  { label: 'Payment History', href: '/payment-history', icon: 'History', roles: ['Member', 'Treasurer', 'Secretary', 'President', 'Admin'] },
  { label: 'Promotions', href: '/promotions', icon: 'TrendingUp', roles: ['Member', 'Treasurer', 'Secretary', 'President', 'Admin'] },
  { label: 'Divisions', href: '/divisions', icon: 'Building2', roles: ['Member', 'Treasurer', 'Secretary', 'President', 'Admin'] },
  { label: 'Announcements', href: '/announcements', icon: 'Megaphone', roles: ['Member', 'Treasurer', 'Secretary', 'President', 'Admin'] },
  { label: 'Events', href: '/events', icon: 'CalendarDays', roles: ['Member', 'Treasurer', 'Secretary', 'President', 'Admin'] },
  { label: 'Documents', href: '/documents', icon: 'FolderOpen', roles: ['Member', 'Treasurer', 'Secretary', 'President', 'Admin'] },
  { label: 'Digital ID', href: '/digital-id', icon: 'CreditCard', roles: ['Member', 'Treasurer', 'Secretary', 'President', 'Admin'] },
  { label: 'Admin Panel', href: '/admin', icon: 'Shield', roles: ['Admin'] },
];
