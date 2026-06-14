
-- Fix: process_first_deposit_bonus agora respeita a configuração do admin
-- (bonus_deposito_ativo / bonus_deposito_tipo / bonus_deposito_valor)
-- em vez de usar tiers fixos hardcoded.

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
  dep_bonus_ativo BOOLEAN;
  dep_bonus_tipo TEXT;
  dep_bonus_valor NUMERIC;
  dep_bonus_calc NUMERIC;
BEGIN
  IF NEW.status = 'aprovado' AND NEW.tipo = 'deposito' AND (OLD.status IS NULL OR OLD.status != 'aprovado') THEN

    SELECT * INTO user_profile FROM public.profiles WHERE id = NEW.user_id;

    -- ── Bónus de PRIMEIRO depósito (configurável pelo admin) ──
    IF NOT COALESCE(user_profile.primeiro_deposito_processado, false) THEN
      SELECT jsonb_object_agg(c.chave, c.valor) INTO config_map
      FROM public.configuracoes_sistema c
      WHERE c.chave IN ('bonus_deposito_ativo','bonus_deposito_tipo','bonus_deposito_valor');

      dep_bonus_ativo := COALESCE((config_map->>'bonus_deposito_ativo')::boolean, false);
      dep_bonus_tipo  := COALESCE(config_map->>'bonus_deposito_tipo', 'percentagem');
      dep_bonus_valor := COALESCE((config_map->>'bonus_deposito_valor')::numeric, 0);

      dep_bonus_calc := 0;
      IF dep_bonus_ativo AND dep_bonus_valor > 0 THEN
        IF dep_bonus_tipo IN ('percentagem','percentual','percent') THEN
          dep_bonus_calc := (NEW.valor * dep_bonus_valor) / 100;
        ELSE
          dep_bonus_calc := dep_bonus_valor;
        END IF;
      END IF;

      IF dep_bonus_calc > 0 THEN
        UPDATE public.profiles
          SET saldo = saldo + dep_bonus_calc,
              primeiro_deposito_processado = TRUE
        WHERE id = NEW.user_id;
      ELSE
        UPDATE public.profiles
          SET primeiro_deposito_processado = TRUE
        WHERE id = NEW.user_id;
      END IF;
    END IF;

    -- ── Bónus de CONVITE (referrer) ──
    referrer_id_val := user_profile.convidado_por;

    IF referrer_id_val IS NOT NULL AND NOT COALESCE(user_profile.bonus_convite_pago, false) THEN
      SELECT jsonb_object_agg(c.chave, c.valor) INTO config_map
      FROM public.configuracoes_sistema c
      WHERE c.chave IN ('bonus_convite_ativo','bonus_convite_tipo','bonus_convite_valor','bonus_convite_deposito_minimo');

      bonus_ativo     := COALESCE((config_map->>'bonus_convite_ativo')::boolean, false);
      bonus_tipo      := COALESCE(config_map->>'bonus_convite_tipo', 'fixo');
      bonus_valor     := COALESCE((config_map->>'bonus_convite_valor')::numeric, 0);
      deposito_minimo := COALESCE((config_map->>'bonus_convite_deposito_minimo')::numeric, 0);

      IF bonus_ativo AND NEW.valor >= deposito_minimo AND bonus_valor > 0 THEN
        IF bonus_tipo IN ('percentual','percentagem','percent') THEN
          bonus_calculado := (NEW.valor * bonus_valor) / 100;
        ELSE
          bonus_calculado := bonus_valor;
        END IF;

        UPDATE public.profiles SET saldo = saldo + bonus_calculado WHERE id = referrer_id_val;
        UPDATE public.profiles SET bonus_convite_pago = TRUE WHERE id = NEW.user_id;

        INSERT INTO public.bonus_convite_historico (referrer_id, invited_user_id, transacao_deposito_id, valor_deposito, valor_bonus, tipo_bonus)
        VALUES (referrer_id_val, NEW.user_id, NEW.id, NEW.valor, bonus_calculado, bonus_tipo);

        DECLARE
          active_invites INTEGER;
          metas_ativo BOOLEAN;
          metas_json JSONB;
          meta RECORD;
        BEGIN
          SELECT COALESCE((SELECT valor FROM configuracoes_sistema WHERE chave = 'metas_convite_ativo'), 'false')::boolean INTO metas_ativo;
          IF metas_ativo THEN
            SELECT COUNT(*) INTO active_invites
            FROM public.profiles
            WHERE convidado_por = referrer_id_val AND primeiro_deposito_processado = TRUE;

            SELECT COALESCE((SELECT valor FROM configuracoes_sistema WHERE chave = 'metas_convite_niveis'), '[]')::jsonb INTO metas_json;
            FOR meta IN SELECT * FROM jsonb_array_elements(metas_json) AS m LOOP
              IF active_invites >= (meta.m->>'convidados')::integer THEN
                INSERT INTO public.metas_convite_alcancadas (user_id, nivel_convidados, valor_bonus)
                VALUES (referrer_id_val, (meta.m->>'convidados')::integer, (meta.m->>'bonus')::numeric)
                ON CONFLICT (user_id, nivel_convidados) DO NOTHING;
                IF FOUND THEN
                  UPDATE public.profiles SET saldo = saldo + (meta.m->>'bonus')::numeric WHERE id = referrer_id_val;
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
