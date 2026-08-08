-- ============================================================
-- Migration: Enforce canonical lowercase donation statuses
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Drop existing constraint
ALTER TABLE public.donations DROP CONSTRAINT IF EXISTS donations_status_check;

-- 2. Update existing data to canonical lowercase values
UPDATE public.donations SET status = 'pending' WHERE status IN ('Pending', 'PENDING');
UPDATE public.donations SET status = 'payment_reported' WHERE status IN ('Payment Reported', 'PAYMENT_REPORTED', 'Payment_Reported');
UPDATE public.donations SET status = 'paid' WHERE status IN ('Paid', 'PAID');
UPDATE public.donations SET status = 'rejected' WHERE status IN ('Rejected', 'REJECTED');
UPDATE public.donations SET status = 'overdue' WHERE status IN ('Overdue', 'OVERDUE');

-- 3. Add strict lowercase constraint
ALTER TABLE public.donations ADD CONSTRAINT donations_status_check CHECK (status IN ('pending', 'payment_reported', 'paid', 'rejected', 'overdue'));

SELECT 'Canonical status migration completed successfully!' as message;
