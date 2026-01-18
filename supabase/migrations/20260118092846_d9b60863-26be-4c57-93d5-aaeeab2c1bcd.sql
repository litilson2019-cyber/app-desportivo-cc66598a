-- Enable realtime for profiles table to sync balance updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- Enable realtime for ajustes_saldo table to track bonus/adjustments
ALTER PUBLICATION supabase_realtime ADD TABLE public.ajustes_saldo;

-- Fix function search_path for increment_saldo (security warning)
CREATE OR REPLACE FUNCTION public.increment_saldo(user_id uuid, amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET saldo = saldo + amount
  WHERE id = user_id;
END;
$$;