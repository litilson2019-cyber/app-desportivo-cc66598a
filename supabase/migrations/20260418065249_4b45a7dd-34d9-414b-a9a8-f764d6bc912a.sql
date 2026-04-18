-- Planos disponíveis (geridos pelo admin)
CREATE TABLE public.planos_carteira (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  preco NUMERIC NOT NULL CHECK (preco >= 0),
  duracao_dias INTEGER NOT NULL CHECK (duracao_dias > 0),
  beneficios JSONB DEFAULT '{}'::jsonb,
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.planos_carteira ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active planos_carteira"
  ON public.planos_carteira FOR SELECT USING (ativo = true OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage planos_carteira"
  ON public.planos_carteira FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_permission(auth.uid(), 'configuracoes'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_permission(auth.uid(), 'configuracoes'));

-- Planos ativos do utilizador
CREATE TABLE public.user_planos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plano_id UUID NOT NULL REFERENCES public.planos_carteira(id) ON DELETE RESTRICT,
  preco_pago NUMERIC NOT NULL,
  ativado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  expira_em TIMESTAMPTZ NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_planos_user ON public.user_planos(user_id, ativo, expira_em);

ALTER TABLE public.user_planos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own planos"
  ON public.user_planos FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own planos"
  ON public.user_planos FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all user_planos"
  ON public.user_planos FOR SELECT USING (has_role(auth.uid(), 'admin') OR has_permission(auth.uid(), 'usuarios'));

-- Função para ativar plano descontando da carteira
CREATE OR REPLACE FUNCTION public.ativar_plano(_plano_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _plano RECORD;
  _saldo_atual NUMERIC;
  _expira TIMESTAMPTZ;
  _user_plano_id UUID;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado');
  END IF;

  SELECT * INTO _plano FROM public.planos_carteira WHERE id = _plano_id AND ativo = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Plano não encontrado');
  END IF;

  SELECT COALESCE(saldo, 0) INTO _saldo_atual FROM public.profiles WHERE id = _user_id FOR UPDATE;

  IF _saldo_atual < _plano.preco THEN
    RETURN jsonb_build_object('success', false, 'error', 'Saldo insuficiente na carteira');
  END IF;

  UPDATE public.profiles SET saldo = saldo - _plano.preco WHERE id = _user_id;

  _expira := now() + (_plano.duracao_dias || ' days')::interval;

  INSERT INTO public.user_planos (user_id, plano_id, preco_pago, expira_em)
  VALUES (_user_id, _plano_id, _plano.preco, _expira)
  RETURNING id INTO _user_plano_id;

  INSERT INTO public.transacoes (user_id, tipo, valor, status, descricao)
  VALUES (_user_id, 'plano', _plano.preco, 'aprovado', 'Ativação do plano: ' || _plano.nome);

  RETURN jsonb_build_object('success', true, 'user_plano_id', _user_plano_id, 'expira_em', _expira);
END;
$$;

-- Função helper para verificar plano ativo
CREATE OR REPLACE FUNCTION public.tem_plano_ativo(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_planos
    WHERE user_id = _user_id AND ativo = true AND expira_em > now()
  );
$$;

-- Jogos para a página de odds
CREATE TABLE public.odds_jogos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipa_casa TEXT NOT NULL,
  equipa_fora TEXT NOT NULL,
  competicao TEXT,
  data_inicio TIMESTAMPTZ NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_odds_jogos_data ON public.odds_jogos(data_inicio, ativo);

ALTER TABLE public.odds_jogos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view active odds_jogos"
  ON public.odds_jogos FOR SELECT
  USING (auth.uid() IS NOT NULL AND (ativo = true OR has_role(auth.uid(), 'admin')));

CREATE POLICY "Admins manage odds_jogos"
  ON public.odds_jogos FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_permission(auth.uid(), 'configuracoes'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_permission(auth.uid(), 'configuracoes'));

-- Odds por casa de apostas
CREATE TABLE public.odds_casas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jogo_id UUID NOT NULL REFERENCES public.odds_jogos(id) ON DELETE CASCADE,
  casa_aposta TEXT NOT NULL,
  odd_casa NUMERIC,
  odd_empate NUMERIC,
  odd_fora NUMERIC,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_odds_casas_jogo ON public.odds_casas(jogo_id);

ALTER TABLE public.odds_casas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view odds_casas"
  ON public.odds_casas FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage odds_casas"
  ON public.odds_casas FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_permission(auth.uid(), 'configuracoes'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_permission(auth.uid(), 'configuracoes'));

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_planos_carteira_upd BEFORE UPDATE ON public.planos_carteira
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_odds_jogos_upd BEFORE UPDATE ON public.odds_jogos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_odds_casas_upd BEFORE UPDATE ON public.odds_casas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.odds_jogos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.odds_casas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_planos;