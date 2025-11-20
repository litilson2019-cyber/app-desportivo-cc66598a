-- Add new columns to transacoes table
ALTER TABLE public.transacoes 
ADD COLUMN IF NOT EXISTS banco text,
ADD COLUMN IF NOT EXISTS comprovativo_url text,
ADD COLUMN IF NOT EXISTS motivo_rejeicao text;

-- Create storage bucket for comprovativos
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprovativos', 'comprovativos', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for comprovativos
CREATE POLICY "Users can upload their own comprovativos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'comprovativos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own comprovativos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'comprovativos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own comprovativos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'comprovativos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);