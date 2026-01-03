-- Drop the existing permissive policy that allows anyone to view
DROP POLICY IF EXISTS "Anyone can view active metodos" ON public.metodos_deposito;

-- Create new policy that requires authentication
CREATE POLICY "Authenticated users can view active metodos" 
ON public.metodos_deposito 
FOR SELECT 
USING (ativo = true AND auth.uid() IS NOT NULL);