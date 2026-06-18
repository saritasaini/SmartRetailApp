-- Create logo_url column in profiles table if it doesn't exist
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Create storage bucket for company logos if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for company-logos bucket
DROP POLICY IF EXISTS "Public Access to Company Logos" ON storage.objects;
CREATE POLICY "Public Access to Company Logos"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'company-logos' );

DROP POLICY IF EXISTS "Public Users can upload company logos" ON storage.objects;
CREATE POLICY "Public Users can upload company logos"
ON storage.objects FOR INSERT
TO public
WITH CHECK ( bucket_id = 'company-logos' );

DROP POLICY IF EXISTS "Authenticated Users can update logos" ON storage.objects;
CREATE POLICY "Authenticated Users can update logos"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'company-logos' );
