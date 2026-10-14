-- ============================================================
-- Kayla City ApartHotel — Phase 1 migration
-- Updates roles from 3 to 5, adds tasks, notifications,
-- gate/visitor log, and shift reports.
-- ============================================================

-- Add is_active column if it does not exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff' AND column_name = 'is_active') THEN
    ALTER TABLE public.staff ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- ---------- UPDATE STAFF ROLE CONSTRAINT ----------
ALTER TABLE public.staff
  DROP CONSTRAINT IF EXISTS staff_role_check;

ALTER TABLE public.staff
  ADD CONSTRAINT staff_role_check
  CHECK (role IN ('owner', 'manager', 'receptionist', 'housekeeping', 'security'));

-- Update any existing 'admin' rows to 'owner', 'front_desk' to 'receptionist'
UPDATE public.staff SET role = 'owner' WHERE role = 'admin';
UPDATE public.staff SET role = 'receptionist' WHERE role = 'front_desk';

-- Update the helper function with new roles
CREATE OR REPLACE FUNCTION public.current_staff_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.staff WHERE id = auth.uid();
$$;

-- ---------- TASKS ----------
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties (id),
  title text NOT NULL,
  description text,
  assigned_to uuid REFERENCES public.staff (id),
  assigned_by uuid REFERENCES public.staff (id),
  reassigned_from uuid REFERENCES public.staff (id), -- original assignee if reassigned
  is_urgent boolean NOT NULL DEFAULT false,
  deadline timestamptz,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'done', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- NOTIFICATIONS ----------
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES public.staff (id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  link text, -- optional: path to navigate to when clicked
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- GATE / VISITOR LOG ----------
CREATE TABLE IF NOT EXISTS public.gate_log_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties (id),
  plate_number text NOT NULL,
  vehicle_type text,
  driver_name text,
  purpose text,
  time_in timestamptz NOT NULL DEFAULT now(),
  time_out timestamptz,
  logged_by uuid REFERENCES public.staff (id),
  notes text
);

CREATE TABLE IF NOT EXISTS public.gate_log_visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties (id),
  full_name text NOT NULL,
  purpose text,
  host_name text, -- who they are visiting
  time_in timestamptz NOT NULL DEFAULT now(),
  time_out timestamptz,
  logged_by uuid REFERENCES public.staff (id),
  notes text
);

-- ---------- SHIFT REPORTS ----------
CREATE TABLE IF NOT EXISTS public.shift_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties (id),
  staff_id uuid NOT NULL REFERENCES public.staff (id),
  shift text NOT NULL CHECK (shift IN ('morning', 'afternoon', 'night')),
  report_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now()
  -- read-only after insert: no update allowed via RLS
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gate_log_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gate_log_visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_reports ENABLE ROW LEVEL SECURITY;

-- TASKS
-- Owner & manager see/manage all tasks
CREATE POLICY "owner_manager_all_tasks" ON public.tasks
  FOR ALL USING (public.current_staff_role() IN ('owner', 'manager'))
  WITH CHECK (public.current_staff_role() IN ('owner', 'manager'));

-- Receptionist can view and create tasks (assign), but not delete
CREATE POLICY "receptionist_tasks" ON public.tasks
  FOR SELECT USING (public.current_staff_role() = 'receptionist');
CREATE POLICY "receptionist_insert_tasks" ON public.tasks
  FOR INSERT WITH CHECK (public.current_staff_role() = 'receptionist');

-- All staff can view and update their own assigned tasks (for status + reassign)
CREATE POLICY "staff_own_tasks_select" ON public.tasks
  FOR SELECT USING (assigned_to = auth.uid());
CREATE POLICY "staff_own_tasks_update" ON public.tasks
  FOR UPDATE USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

-- NOTIFICATIONS — each staff member only sees their own
CREATE POLICY "staff_own_notifications" ON public.notifications
  FOR ALL USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- Owner & manager can send notifications (insert to anyone)
CREATE POLICY "owner_manager_send_notifications" ON public.notifications
  FOR INSERT WITH CHECK (public.current_staff_role() IN ('owner', 'manager'));

-- GATE LOG — security logs; owner & manager view all
CREATE POLICY "security_gate_vehicles" ON public.gate_log_vehicles
  FOR ALL USING (
    public.current_staff_role() = 'security'
    OR public.current_staff_role() IN ('owner', 'manager')
  )
  WITH CHECK (public.current_staff_role() = 'security');

CREATE POLICY "security_gate_visitors" ON public.gate_log_visitors
  FOR ALL USING (
    public.current_staff_role() = 'security'
    OR public.current_staff_role() IN ('owner', 'manager')
  )
  WITH CHECK (public.current_staff_role() = 'security');

-- SHIFT REPORTS
-- All staff can insert their own report
CREATE POLICY "staff_insert_own_report" ON public.shift_reports
  FOR INSERT WITH CHECK (staff_id = auth.uid());

-- Staff can only view their own reports
CREATE POLICY "staff_view_own_reports" ON public.shift_reports
  FOR SELECT USING (
    staff_id = auth.uid()
    OR public.current_staff_role() IN ('owner', 'manager')
  );

-- No updates or deletes — reports are read-only once submitted
-- (no UPDATE or DELETE policies means those are blocked by RLS)
