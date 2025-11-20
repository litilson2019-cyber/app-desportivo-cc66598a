-- Create referrals table for invitation system
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  codigo_convite text NOT NULL UNIQUE,
  total_convidados integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own referrals"
ON public.referrals
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own referrals"
ON public.referrals
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own referrals"
ON public.referrals
FOR UPDATE
USING (auth.uid() = user_id);

-- Create invited_users table to track who was invited
CREATE TABLE IF NOT EXISTS public.invited_users (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invited_users ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own invited users"
ON public.invited_users
FOR SELECT
USING (auth.uid() = referrer_id);

CREATE POLICY "System can insert invited users"
ON public.invited_users
FOR INSERT
WITH CHECK (true);

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  code text;
  exists boolean;
BEGIN
  LOOP
    code := substring(md5(random()::text) from 1 for 8);
    SELECT EXISTS(SELECT 1 FROM public.referrals WHERE codigo_convite = code) INTO exists;
    EXIT WHEN NOT exists;
  END LOOP;
  RETURN code;
END;
$$;