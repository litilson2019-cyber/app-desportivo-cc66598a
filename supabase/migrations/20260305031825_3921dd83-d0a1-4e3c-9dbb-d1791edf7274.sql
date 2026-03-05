
-- 1. Add referral tracking fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS convidado_por uuid,
ADD COLUMN IF NOT EXISTS bonus_convite_pago boolean DEFAULT false;

-- Populate convidado_por from existing invited_users data
UPDATE public.profiles p
SET convidado_por = iu.referrer_id
FROM public.invited_users iu
WHERE iu.invited_user_id = p.id
AND p.convidado_por IS NULL;

-- 2. Insert referral bonus config keys
INSERT INTO public.configuracoes_sistema (chave, valor, descricao) VALUES
('bonus_convite_ativo', 'true', 'Ativar/desativar sistema de bônus por convite'),
('bonus_convite_tipo', 'fixo', 'Tipo de bônus: fixo ou percentual'),
('bonus_convite_valor', '500', 'Valor do bônus (fixo em Kz ou percentual)'),
('bonus_convite_deposito_minimo', '3000', 'Valor mínimo do depósito para liberar bônus de convite'),
('metas_convite_ativo', 'false', 'Ativar sistema de metas por convites ativos'),
('metas_convite_niveis', '[{"convidados":5,"bonus":2000},{"convidados":10,"bonus":5000},{"convidados":25,"bonus":15000},{"convidados":50,"bonus":40000}]', 'Níveis de metas por convidados ativos (JSON)')
ON CONFLICT (chave) DO NOTHING;

-- 3. Create table for referral bonus history
CREATE TABLE IF NOT EXISTS public.bonus_convite_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  invited_user_id uuid NOT NULL,
  transacao_deposito_id uuid NOT NULL,
  valor_deposito numeric NOT NULL,
  valor_bonus numeric NOT NULL,
  tipo_bonus text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.bonus_convite_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all bonus history"
ON public.bonus_convite_historico FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own bonus history"
ON public.bonus_convite_historico FOR SELECT
USING (auth.uid() = referrer_id);

CREATE POLICY "System can insert bonus history"
ON public.bonus_convite_historico FOR INSERT
WITH CHECK (true);

-- 4. Create table for referral goals achieved
CREATE TABLE IF NOT EXISTS public.metas_convite_alcancadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nivel_convidados integer NOT NULL,
  valor_bonus numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, nivel_convidados)
);

ALTER TABLE public.metas_convite_alcancadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all goals"
ON public.metas_convite_alcancadas FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own goals"
ON public.metas_convite_alcancadas FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert goals"
ON public.metas_convite_alcancadas FOR INSERT
WITH CHECK (true);

-- 5. Recreate the deposit bonus trigger function with referral logic
CREATE OR REPLACE FUNCTION public.process_first_deposit_bonus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_profile RECORD;
  bonus_ativo BOOLEAN;
  bonus_tipo TEXT;
  bonus_valor NUMERIC;
  deposito_minimo NUMERIC;
  bonus_calculado NUMERIC;
  referrer_id_val UUID;
  config_map JSONB;
BEGIN
  -- Only process when deposit is approved
  IF NEW.status = 'aprovado' AND NEW.tipo = 'deposito' AND (OLD.status IS NULL OR OLD.status != 'aprovado') THEN
    
    -- Get user profile
    SELECT * INTO user_profile FROM public.profiles WHERE id = NEW.user_id;
    
    -- Process standard first deposit bonus (existing logic)
    IF NOT COALESCE(user_profile.primeiro_deposito_processado, false) THEN
      DECLARE
        std_bonus NUMERIC;
      BEGIN
        std_bonus := calculate_bonus_amount(NEW.valor);
        IF std_bonus > 0 THEN
          UPDATE public.profiles
          SET saldo = saldo + std_bonus,
              primeiro_deposito_processado = TRUE
          WHERE id = NEW.user_id;
        ELSE
          UPDATE public.profiles
          SET primeiro_deposito_processado = TRUE
          WHERE id = NEW.user_id;
        END IF;
      END;
    END IF;
    
    -- Process referral bonus
    referrer_id_val := user_profile.convidado_por;
    
    IF referrer_id_val IS NOT NULL AND NOT COALESCE(user_profile.bonus_convite_pago, false) THEN
      -- Load referral bonus config
      SELECT jsonb_object_agg(c.chave, c.valor) INTO config_map
      FROM public.configuracoes_sistema c
      WHERE c.chave IN ('bonus_convite_ativo', 'bonus_convite_tipo', 'bonus_convite_valor', 'bonus_convite_deposito_minimo');
      
      bonus_ativo := COALESCE((config_map->>'bonus_convite_ativo')::boolean, false);
      bonus_tipo := COALESCE(config_map->>'bonus_convite_tipo', 'fixo');
      bonus_valor := COALESCE((config_map->>'bonus_convite_valor')::numeric, 0);
      deposito_minimo := COALESCE((config_map->>'bonus_convite_deposito_minimo')::numeric, 0);
      
      IF bonus_ativo AND NEW.valor >= deposito_minimo AND bonus_valor > 0 THEN
        -- Calculate bonus
        IF bonus_tipo = 'percentual' THEN
          bonus_calculado := (NEW.valor * bonus_valor) / 100;
        ELSE
          bonus_calculado := bonus_valor;
        END IF;
        
        -- Credit referrer
        UPDATE public.profiles
        SET saldo = saldo + bonus_calculado
        WHERE id = referrer_id_val;
        
        -- Mark bonus as paid
        UPDATE public.profiles
        SET bonus_convite_pago = TRUE
        WHERE id = NEW.user_id;
        
        -- Record in history
        INSERT INTO public.bonus_convite_historico (referrer_id, invited_user_id, transacao_deposito_id, valor_deposito, valor_bonus, tipo_bonus)
        VALUES (referrer_id_val, NEW.user_id, NEW.id, NEW.valor, bonus_calculado, bonus_tipo);
        
        -- Check and process goals
        DECLARE
          active_invites INTEGER;
          metas_ativo BOOLEAN;
          metas_json JSONB;
          meta RECORD;
        BEGIN
          SELECT COALESCE((SELECT valor FROM configuracoes_sistema WHERE chave = 'metas_convite_ativo'), 'false')::boolean INTO metas_ativo;
          
          IF metas_ativo THEN
            -- Count active invites (those who made approved deposit)
            SELECT COUNT(*) INTO active_invites
            FROM public.profiles
            WHERE convidado_por = referrer_id_val
            AND primeiro_deposito_processado = TRUE;
            
            SELECT COALESCE((SELECT valor FROM configuracoes_sistema WHERE chave = 'metas_convite_niveis'), '[]')::jsonb INTO metas_json;
            
            FOR meta IN SELECT * FROM jsonb_array_elements(metas_json) AS m
            LOOP
              IF active_invites >= (meta.m->>'convidados')::integer THEN
                INSERT INTO public.metas_convite_alcancadas (user_id, nivel_convidados, valor_bonus)
                VALUES (referrer_id_val, (meta.m->>'convidados')::integer, (meta.m->>'bonus')::numeric)
                ON CONFLICT (user_id, nivel_convidados) DO NOTHING;
                
                -- Credit goal bonus if newly inserted
                IF FOUND THEN
                  UPDATE public.profiles
                  SET saldo = saldo + (meta.m->>'bonus')::numeric
                  WHERE id = referrer_id_val;
                END IF;
              END IF;
            END LOOP;
          END IF;
        END;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 6. Create trigger on transacoes
DROP TRIGGER IF EXISTS trigger_process_deposit_bonus ON public.transacoes;
CREATE TRIGGER trigger_process_deposit_bonus
AFTER UPDATE ON public.transacoes
FOR EACH ROW
EXECUTE FUNCTION public.process_first_deposit_bonus();

-- 7. Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.bonus_convite_historico;
