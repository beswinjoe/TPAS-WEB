-- ============================================================
-- TPAS Kanniyakumari - Complete Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- MEMBERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  photo_url TEXT,
  phone TEXT,
  email TEXT,
  role TEXT NOT NULL CHECK (role IN ('President', 'Secretary', 'Treasurer', 'Member', 'Admin')) DEFAULT 'Member',
  division TEXT,
  sub_division TEXT,
  joining_date DATE,
  status TEXT NOT NULL CHECK (status IN ('Active', 'Inactive', 'Pending')) DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DONATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 500.00,
  status TEXT NOT NULL CHECK (status IN ('Paid', 'Pending')) DEFAULT 'Pending',
  payment_date DATE,
  receipt_number TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROMOTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
  old_role TEXT NOT NULL,
  new_role TEXT NOT NULL,
  promotion_date DATE NOT NULL DEFAULT CURRENT_DATE,
  approved_by UUID REFERENCES public.members(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ANNOUNCEMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('General', 'Important', 'Event', 'Finance', 'Circular')) DEFAULT 'General',
  posted_by UUID REFERENCES public.members(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  attachments TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EVENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  venue TEXT NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  rsvps UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DOCUMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Membership Forms', 'Meeting Minutes', 'Rules', 'Annual Reports', 'Circulars')),
  file_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES public.members(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DIVISIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.divisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  sub_divisions TEXT[] DEFAULT '{}',
  head_member_id UUID REFERENCES public.members(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ACTIVITY LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SEED DATA - DIVISIONS
-- ============================================================
INSERT INTO public.divisions (name, sub_divisions) VALUES
  ('Kanniyakumari North', ARRAY['Ward 1', 'Ward 2', 'Ward 3', 'Ward 4']),
  ('Kanniyakumari South', ARRAY['Ward 5', 'Ward 6', 'Ward 7', 'Ward 8']),
  ('Nagercoil Division', ARRAY['Zone A', 'Zone B', 'Zone C']),
  ('Thuckalay Division', ARRAY['Block 1', 'Block 2', 'Block 3']),
  ('Colachel Division', ARRAY['Sector 1', 'Sector 2'])
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED DATA - MEMBERS (Demo)
-- ============================================================
INSERT INTO public.members (employee_id, name, phone, email, role, division, sub_division, joining_date, status) VALUES
  ('TPAS001', 'Admin User', '9876543210', 'admin@tpas.org', 'Admin', 'Kanniyakumari North', 'Ward 1', '2020-01-15', 'Active'),
  ('TPAS002', 'Rajesh Kumar', '9876543211', 'rajesh@tpas.org', 'President', 'Kanniyakumari North', 'Ward 2', '2020-02-01', 'Active'),
  ('TPAS003', 'Priya Selvam', '9876543212', 'priya@tpas.org', 'Secretary', 'Nagercoil Division', 'Zone A', '2020-03-10', 'Active'),
  ('TPAS004', 'Suresh Pandian', '9876543213', 'suresh@tpas.org', 'Treasurer', 'Kanniyakumari South', 'Ward 5', '2020-04-15', 'Active'),
  ('TPAS005', 'Meena Devi', '9876543214', 'meena@tpas.org', 'Member', 'Thuckalay Division', 'Block 1', '2021-01-20', 'Active'),
  ('TPAS006', 'Arun Krishnan', '9876543215', 'arun@tpas.org', 'Member', 'Colachel Division', 'Sector 1', '2021-03-05', 'Active'),
  ('TPAS007', 'Lakshmi Rajan', '9876543216', 'lakshmi@tpas.org', 'Member', 'Nagercoil Division', 'Zone B', '2021-06-15', 'Active'),
  ('TPAS008', 'Vijay Sekar', '9876543217', 'vijay@tpas.org', 'Member', 'Kanniyakumari North', 'Ward 3', '2022-01-10', 'Active'),
  ('TPAS009', 'Anitha Raj', '9876543218', 'anitha@tpas.org', 'Member', 'Kanniyakumari South', 'Ward 6', '2022-05-20', 'Active'),
  ('TPAS010', 'Dinesh Kumar', '9876543219', 'dinesh@tpas.org', 'Member', 'Thuckalay Division', 'Block 2', '2023-02-14', 'Active')
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED DATA - DONATIONS
-- ============================================================
DO $$
DECLARE
  m RECORD;
BEGIN
  FOR m IN SELECT id FROM public.members LOOP
    -- 2022 - all paid
    INSERT INTO public.donations (member_id, year, amount, status, payment_date, receipt_number)
    VALUES (m.id, 2022, 500.00, 'Paid', '2022-04-15', 'TPAS-2022-' || substring(m.id::text, 1, 6))
    ON CONFLICT DO NOTHING;
    
    -- 2023 - all paid
    INSERT INTO public.donations (member_id, year, amount, status, payment_date, receipt_number)
    VALUES (m.id, 2023, 500.00, 'Paid', '2023-03-20', 'TPAS-2023-' || substring(m.id::text, 1, 6))
    ON CONFLICT DO NOTHING;
    
    -- 2024 - mixed
    IF random() > 0.3 THEN
      INSERT INTO public.donations (member_id, year, amount, status, payment_date, receipt_number)
      VALUES (m.id, 2024, 500.00, 'Paid', '2024-05-10', 'TPAS-2024-' || substring(m.id::text, 1, 6))
      ON CONFLICT DO NOTHING;
    ELSE
      INSERT INTO public.donations (member_id, year, amount, status)
      VALUES (m.id, 2024, 500.00, 'Pending')
      ON CONFLICT DO NOTHING;
    END IF;
    
    -- 2025 - mostly pending
    IF random() > 0.6 THEN
      INSERT INTO public.donations (member_id, year, amount, status, payment_date, receipt_number)
      VALUES (m.id, 2025, 500.00, 'Paid', '2025-04-01', 'TPAS-2025-' || substring(m.id::text, 1, 6))
      ON CONFLICT DO NOTHING;
    ELSE
      INSERT INTO public.donations (member_id, year, amount, status)
      VALUES (m.id, 2025, 500.00, 'Pending')
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- SEED DATA - PROMOTIONS
-- ============================================================
INSERT INTO public.promotions (member_id, old_role, new_role, promotion_date, approved_by)
SELECT 
  m.id,
  'Member',
  'Treasurer',
  '2022-06-01',
  a.id
FROM public.members m, public.members a
WHERE m.employee_id = 'TPAS004' AND a.employee_id = 'TPAS001'
ON CONFLICT DO NOTHING;

INSERT INTO public.promotions (member_id, old_role, new_role, promotion_date, approved_by)
SELECT 
  m.id,
  'Member',
  'Secretary',
  '2021-08-15',
  a.id
FROM public.members m, public.members a
WHERE m.employee_id = 'TPAS003' AND a.employee_id = 'TPAS001'
ON CONFLICT DO NOTHING;

INSERT INTO public.promotions (member_id, old_role, new_role, promotion_date, approved_by)
SELECT 
  m.id,
  'Secretary',
  'President',
  '2022-01-01',
  a.id
FROM public.members m, public.members a
WHERE m.employee_id = 'TPAS002' AND a.employee_id = 'TPAS001'
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED DATA - ANNOUNCEMENTS
-- ============================================================
INSERT INTO public.announcements (title, description, category, posted_by, date)
SELECT 
  'Annual General Meeting 2025',
  'The Annual General Meeting of TPAS Kanniyakumari is scheduled for this month. All members are requested to attend. Agenda includes review of financial statements, election of new office bearers, and discussion of upcoming projects.',
  'Important',
  m.id,
  '2025-07-15'
FROM public.members m WHERE m.employee_id = 'TPAS001'
ON CONFLICT DO NOTHING;

INSERT INTO public.announcements (title, description, category, posted_by, date)
SELECT 
  'Donation Collection Drive 2025',
  'Annual donation collection for 2025 has commenced. Members are requested to pay their yearly contribution of ₹500 before the due date. Receipts will be issued immediately upon payment.',
  'Finance',
  m.id,
  '2025-04-01'
FROM public.members m WHERE m.employee_id = 'TPAS001'
ON CONFLICT DO NOTHING;

INSERT INTO public.announcements (title, description, category, posted_by, date)
SELECT 
  'New Member Orientation Program',
  'A special orientation program for new members has been organized. The program will cover organizational rules, member benefits, and upcoming activities. New members are strongly encouraged to attend.',
  'General',
  m.id,
  '2025-06-20'
FROM public.members m WHERE m.employee_id = 'TPAS003'
ON CONFLICT DO NOTHING;

INSERT INTO public.announcements (title, description, category, posted_by, date)
SELECT 
  'District Committee Meeting - July 2025',
  'The District Committee Meeting will be held next Saturday at the main hall. District representatives are requested to attend with their division reports.',
  'Event',
  m.id,
  '2025-07-01'
FROM public.members m WHERE m.employee_id = 'TPAS003'
ON CONFLICT DO NOTHING;

INSERT INTO public.announcements (title, description, category, posted_by, date)
SELECT 
  'Updated Membership Rules - Circular 2025',
  'Please find attached the updated membership rules and regulations for 2025. All members must read and acknowledge the new rules. Key changes include updated donation schedules and meeting attendance requirements.',
  'Circular',
  m.id,
  '2025-01-15'
FROM public.members m WHERE m.employee_id = 'TPAS001'
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED DATA - EVENTS
-- ============================================================
INSERT INTO public.events (title, venue, description, date, time) VALUES
  ('Monthly Chapter Meeting - August 2025', 'TPAS Community Hall, Nagercoil', 'Regular monthly chapter meeting to discuss organizational affairs, review member grievances, and plan upcoming activities. Refreshments will be provided.', '2025-08-15', '10:00'),
  ('Annual Sports Day 2025', 'District Sports Complex, Kanniyakumari', 'Annual sports and recreational event for all TPAS members and their families. Events include cricket, volleyball, and athletics. Prizes for winners.', '2025-09-05', '08:00'),
  ('Leadership Training Workshop', 'Hotel Saravana Bhavan, Nagercoil', 'A full-day leadership training workshop for office bearers and committee members. Registration required. Limited seats available.', '2025-08-28', '09:00'),
  ('Charity Drive - Flood Relief', 'Division Offices Across Kanniyakumari', 'Organization-wide charity drive to collect relief materials for flood-affected families in the district. Members are urged to contribute generously.', '2025-08-20', '07:00'),
  ('Retirement Farewell - Senior Members', 'TPAS Conference Hall, Kanniyakumari', 'Farewell function for senior members retiring this year. All members are cordially invited to join the celebration of their contributions.', '2025-09-30', '18:00')
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED DATA - DOCUMENTS
-- ============================================================
INSERT INTO public.documents (title, category, file_url, uploaded_by)
SELECT 
  'Membership Application Form 2025',
  'Membership Forms',
  '/documents/membership-form-2025.pdf',
  m.id
FROM public.members m WHERE m.employee_id = 'TPAS001'
ON CONFLICT DO NOTHING;

INSERT INTO public.documents (title, category, file_url, uploaded_by)
SELECT 
  'Annual Report 2024',
  'Annual Reports',
  '/documents/annual-report-2024.pdf',
  m.id
FROM public.members m WHERE m.employee_id = 'TPAS001'
ON CONFLICT DO NOTHING;

INSERT INTO public.documents (title, category, file_url, uploaded_by)
SELECT 
  'Meeting Minutes - June 2025',
  'Meeting Minutes',
  '/documents/minutes-june-2025.pdf',
  m.id
FROM public.members m WHERE m.employee_id = 'TPAS003'
ON CONFLICT DO NOTHING;

INSERT INTO public.documents (title, category, file_url, uploaded_by)
SELECT 
  'TPAS Constitution and Rules',
  'Rules',
  '/documents/tpas-constitution.pdf',
  m.id
FROM public.members m WHERE m.employee_id = 'TPAS001'
ON CONFLICT DO NOTHING;

INSERT INTO public.documents (title, category, file_url, uploaded_by)
SELECT 
  'General Circular - July 2025',
  'Circulars',
  '/documents/circular-july-2025.pdf',
  m.id
FROM public.members m WHERE m.employee_id = 'TPAS001'
ON CONFLICT DO NOTHING;

-- ============================================================
-- ROW LEVEL SECURITY (Optional - Enable after testing)
-- ============================================================
-- ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
-- (Customize RLS policies based on your auth setup)

-- ============================================================
-- NOTE ON PASSWORDS
-- ============================================================
-- Since we're using Employee ID + custom password (not Supabase Auth email),
-- the app uses a simple password check stored in a separate auth table.
-- For production, use Supabase Auth or bcrypt hashing.

CREATE TABLE IF NOT EXISTS public.member_auth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID UNIQUE REFERENCES public.members(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default password for all demo members: "tpas@2025"
-- In production, hash passwords with bcrypt
-- Demo: storing plain text only for local development
INSERT INTO public.member_auth (member_id, password_hash)
SELECT id, 'tpas@2025' FROM public.members
ON CONFLICT DO NOTHING;

-- Done!
SELECT 'Schema and demo data created successfully!' as message;
