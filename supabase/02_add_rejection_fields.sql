-- ============================================================
-- Patch: Add rejection tracking to donations
-- Run this in your Supabase SQL Editor
-- ============================================================

ALTER TABLE public.donations 
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES public.members(id),
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

SELECT 'Patch completed successfully!' as message;
