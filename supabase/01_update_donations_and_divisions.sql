-- ============================================================
-- Migration: TPAS Kanniyakumari -> Tamil Nadu Division Expansion & Donation Update
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. DIVISION SYSTEM EXPANSION
-- ============================================================

-- Rename old divisions table to preserve data just in case
ALTER TABLE IF EXISTS public.divisions RENAME TO old_divisions;

-- Create new relational divisions table
CREATE TABLE public.divisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  state TEXT DEFAULT 'Tamil Nadu',
  active BOOLEAN DEFAULT true,
  president_id UUID,
  secretary_id UUID,
  treasurer_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create sub_divisions table
CREATE TABLE public.sub_divisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id UUID REFERENCES public.divisions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  coordinator_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign keys to members
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES public.divisions(id) ON DELETE SET NULL;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS sub_division_id UUID REFERENCES public.sub_divisions(id) ON DELETE SET NULL;

-- Seed new divisions
INSERT INTO public.divisions (name) VALUES 
('Kanniyakumari'), ('Tirunelveli'), ('Thoothukudi'), ('Madurai'), ('Coimbatore'), ('Chennai')
ON CONFLICT DO NOTHING;

-- Seed sub divisions for Kanniyakumari based on old divisions + new examples
DO $$
DECLARE
  kk_id UUID;
BEGIN
  SELECT id INTO kk_id FROM public.divisions WHERE name = 'Kanniyakumari';
  IF kk_id IS NOT NULL THEN
    INSERT INTO public.sub_divisions (division_id, name) VALUES 
    (kk_id, 'Kanniyakumari North'), (kk_id, 'Kanniyakumari South'), 
    (kk_id, 'Nagercoil'), (kk_id, 'Thuckalay'), (kk_id, 'Kuzhithurai'), (kk_id, 'Colachel');
  END IF;
END $$;

-- Migrate Member Data (Mapping old text fields to new IDs)
DO $$
DECLARE
  kk_id UUID;
BEGIN
  SELECT id INTO kk_id FROM public.divisions WHERE name = 'Kanniyakumari';
  
  IF kk_id IS NOT NULL THEN
    UPDATE public.members m
    SET 
      division_id = kk_id,
      sub_division_id = (
        SELECT id FROM public.sub_divisions 
        WHERE division_id = kk_id
        AND name = CASE 
          WHEN m.division = 'Nagercoil Division' THEN 'Nagercoil'
          WHEN m.division = 'Thuckalay Division' THEN 'Thuckalay'
          WHEN m.division = 'Colachel Division' THEN 'Colachel'
          ELSE m.division 
        END
        LIMIT 1
      )
    WHERE m.division IS NOT NULL AND m.division_id IS NULL;
  END IF;
END $$;


-- ============================================================
-- 2. DONATION SYSTEM OVERHAUL
-- ============================================================

-- Drop existing check constraint
ALTER TABLE public.donations DROP CONSTRAINT IF EXISTS donations_status_check;

-- Add new columns for the workflow
ALTER TABLE public.donations 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.members(id),
ADD COLUMN IF NOT EXISTS reported_by UUID REFERENCES public.members(id),
ADD COLUMN IF NOT EXISTS reported_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS transaction_reference TEXT,
ADD COLUMN IF NOT EXISTS payment_proof_url TEXT,
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.members(id),
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES public.members(id),
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Convert existing statuses
UPDATE public.donations SET status = 'PAID' WHERE status = 'Paid';
UPDATE public.donations SET status = 'PENDING' WHERE status = 'Pending';

-- Add new constraint
ALTER TABLE public.donations ADD CONSTRAINT donations_status_check CHECK (status IN ('PENDING', 'PAYMENT_REPORTED', 'PAID', 'REJECTED', 'OVERDUE'));

-- Populate title for old donations so they look nice
UPDATE public.donations SET title = 'Annual Membership Donation ' || year::text WHERE title IS NULL;

-- Select statement to verify success
SELECT 'Migration completed successfully!' as message;
