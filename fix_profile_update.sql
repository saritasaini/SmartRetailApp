-- Fix: Allow users (Company/Customer) to update their own profile data like logo_url
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING ( auth.uid() = id );
