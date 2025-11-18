-- Create function to increment saldo
CREATE OR REPLACE FUNCTION increment_saldo(user_id UUID, amount DECIMAL)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET saldo = saldo + amount
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;