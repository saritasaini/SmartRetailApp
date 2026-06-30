-- Add allow_pay_later column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS allow_pay_later BOOLEAN DEFAULT true;

-- Ensure RLS allows reading this column (RLS is already configured for profiles, so this just adds the column).
