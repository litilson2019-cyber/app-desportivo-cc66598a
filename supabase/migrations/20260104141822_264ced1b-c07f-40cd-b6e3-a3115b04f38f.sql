-- Add RLS policies for planos table to allow admins to manage plans
CREATE POLICY "Admins can insert planos" 
ON public.planos 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update planos" 
ON public.planos 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete planos" 
ON public.planos 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add permission for moderators with configuracoes to manage planos
CREATE POLICY "Users with configuracoes permission can insert planos" 
ON public.planos 
FOR INSERT 
WITH CHECK (has_permission(auth.uid(), 'configuracoes'::text));

CREATE POLICY "Users with configuracoes permission can update planos" 
ON public.planos 
FOR UPDATE 
USING (has_permission(auth.uid(), 'configuracoes'::text));

CREATE POLICY "Users with configuracoes permission can delete planos" 
ON public.planos 
FOR DELETE 
USING (has_permission(auth.uid(), 'configuracoes'::text));

-- Add RLS policies for moderators with usuarios permission to view all profiles
CREATE POLICY "Users with usuarios permission can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_permission(auth.uid(), 'usuarios'::text));

CREATE POLICY "Users with usuarios permission can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (has_permission(auth.uid(), 'usuarios'::text));

-- Add RLS policy for moderators with usuarios permission to view invited_users
CREATE POLICY "Admins can view all invited users" 
ON public.invited_users 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add RLS policy for moderators to view referrals
CREATE POLICY "Admins can view all referrals" 
ON public.referrals 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add policies for balance adjustments for moderators with usuarios permission
CREATE POLICY "Users with usuarios permission can insert adjustments" 
ON public.ajustes_saldo 
FOR INSERT 
WITH CHECK (has_permission(auth.uid(), 'usuarios'::text));

CREATE POLICY "Users with usuarios permission can view adjustments" 
ON public.ajustes_saldo 
FOR SELECT 
USING (has_permission(auth.uid(), 'usuarios'::text));

-- Add policies for bilhetes for moderators with bilhetes permission
CREATE POLICY "Admins can view all bilhetes" 
ON public.bilhetes 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users with bilhetes permission can view all bilhetes" 
ON public.bilhetes 
FOR SELECT 
USING (has_permission(auth.uid(), 'bilhetes'::text));