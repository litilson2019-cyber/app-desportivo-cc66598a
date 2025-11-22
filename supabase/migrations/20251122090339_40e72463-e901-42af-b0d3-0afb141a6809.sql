-- Add field to track if user already received first deposit bonus
ALTER TABLE public.profiles 
ADD COLUMN primeiro_deposito_processado BOOLEAN DEFAULT FALSE;

-- Function to calculate bonus amount based on deposit value
CREATE OR REPLACE FUNCTION public.calculate_bonus_amount(valor_depositado NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
BEGIN
  IF valor_depositado >= 125000 THEN
    RETURN 25000;
  ELSIF valor_depositado >= 52000 THEN
    RETURN 10000;
  ELSIF valor_depositado >= 26000 THEN
    RETURN 5000;
  ELSIF valor_depositado >= 12000 THEN
    RETURN 3000;
  ELSIF valor_depositado >= 6000 THEN
    RETURN 1500;
  ELSIF valor_depositado >= 3000 THEN
    RETURN 1000;
  ELSIF valor_depositado >= 1000 THEN
    RETURN 300;
  ELSE
    RETURN 0;
  END IF;
END;
$$;

-- Function to process first deposit bonus (including referral bonus)
CREATE OR REPLACE FUNCTION public.process_first_deposit_bonus()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_already_received BOOLEAN;
  bonus_amount NUMERIC;
  referrer_user_id UUID;
BEGIN
  -- Only process if transaction is approved and is a deposit
  IF NEW.status = 'aprovado' AND NEW.tipo = 'deposito' AND OLD.status != 'aprovado' THEN
    
    -- Check if user already received first deposit bonus
    SELECT primeiro_deposito_processado INTO user_already_received
    FROM public.profiles
    WHERE id = NEW.user_id;
    
    -- Only process if user hasn't received bonus yet
    IF NOT user_already_received THEN
      
      -- Calculate bonus amount
      bonus_amount := calculate_bonus_amount(NEW.valor);
      
      -- Add bonus to user's balance
      IF bonus_amount > 0 THEN
        UPDATE public.profiles
        SET saldo = saldo + bonus_amount,
            primeiro_deposito_processado = TRUE
        WHERE id = NEW.user_id;
        
        -- Check if user was referred by someone
        SELECT referrer_id INTO referrer_user_id
        FROM public.invited_users
        WHERE invited_user_id = NEW.user_id;
        
        -- If user was referred, give same bonus to referrer
        IF referrer_user_id IS NOT NULL THEN
          UPDATE public.profiles
          SET saldo = saldo + bonus_amount
          WHERE id = referrer_user_id;
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically process bonus when deposit is approved
DROP TRIGGER IF EXISTS trigger_process_first_deposit_bonus ON public.transacoes;
CREATE TRIGGER trigger_process_first_deposit_bonus
AFTER UPDATE ON public.transacoes
FOR EACH ROW
EXECUTE FUNCTION public.process_first_deposit_bonus();