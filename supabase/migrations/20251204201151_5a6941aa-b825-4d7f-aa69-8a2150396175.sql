-- Add blocked status to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bloqueado boolean DEFAULT false;

-- Create balance adjustments history table
CREATE TABLE public.ajustes_saldo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL,
  valor numeric NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('adicionar', 'remover')),
  motivo text,
  saldo_anterior numeric NOT NULL,
  saldo_novo numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ajustes_saldo ENABLE ROW LEVEL SECURITY;

-- RLS policies for balance adjustments
CREATE POLICY "Admins can view all adjustments"
ON public.ajustes_saldo FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert adjustments"
ON public.ajustes_saldo FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Users can view their own adjustments
CREATE POLICY "Users can view own adjustments"
ON public.ajustes_saldo FOR SELECT
USING (auth.uid() = user_id);