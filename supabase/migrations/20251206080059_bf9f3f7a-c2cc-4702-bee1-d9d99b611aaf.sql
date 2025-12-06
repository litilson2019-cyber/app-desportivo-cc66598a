-- Tornar o bucket comprovativos público para visualização
UPDATE storage.buckets SET public = true WHERE id = 'comprovativos';

-- Criar políticas RLS para o bucket comprovativos
-- Permitir que usuários autenticados façam upload de seus próprios comprovativos
CREATE POLICY "Users can upload own comprovativos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'comprovativos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Permitir que qualquer um veja os comprovativos (bucket público)
CREATE POLICY "Anyone can view comprovativos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'comprovativos');

-- Permitir que admins vejam todos os comprovativos
CREATE POLICY "Admins can manage all comprovativos"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'comprovativos' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'comprovativos' AND public.has_role(auth.uid(), 'admin'));