-- Add policy to allow moderators with depositos permission to update transactions
CREATE POLICY "Moderators with depositos permission can update transacoes" 
ON public.transacoes 
FOR UPDATE 
USING (has_permission(auth.uid(), 'depositos'));

-- Add policy to allow moderators with depositos permission to view all transactions
CREATE POLICY "Moderators with depositos permission can view all transacoes" 
ON public.transacoes 
FOR SELECT 
USING (has_permission(auth.uid(), 'depositos'));

-- Add policy to allow users with logs permission to insert admin logs
CREATE POLICY "Users with logs permission can insert logs" 
ON public.admin_logs 
FOR INSERT 
WITH CHECK (has_permission(auth.uid(), 'logs'));

-- Add policy to allow users with logs permission to view admin logs
CREATE POLICY "Users with logs permission can view logs" 
ON public.admin_logs 
FOR SELECT 
USING (has_permission(auth.uid(), 'logs'));