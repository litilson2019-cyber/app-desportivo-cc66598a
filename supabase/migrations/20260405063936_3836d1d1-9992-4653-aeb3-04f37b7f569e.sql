
-- Table for highlight campaigns
CREATE TABLE public.destaques_vitrine (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  tipo text NOT NULL DEFAULT 'semanal', -- clique, visualizacao, semanal
  orcamento numeric NOT NULL DEFAULT 0,
  gasto numeric NOT NULL DEFAULT 0,
  preco_unitario numeric NOT NULL DEFAULT 0, -- cost per click/view or weekly price
  prioridade integer NOT NULL DEFAULT 0, -- higher = more visible (calculated from budget)
  data_inicio timestamp with time zone NOT NULL DEFAULT now(),
  data_fim timestamp with time zone NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.destaques_vitrine ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active destaques" ON public.destaques_vitrine
  FOR SELECT USING (ativo = true AND now() BETWEEN data_inicio AND data_fim);

CREATE POLICY "Users can insert own destaques" ON public.destaques_vitrine
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM lojas WHERE id = loja_id AND user_id = auth.uid()));

CREATE POLICY "Users can update own destaques" ON public.destaques_vitrine
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own destaques" ON public.destaques_vitrine
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all destaques" ON public.destaques_vitrine
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Table for tracking interactions (clicks/views) that get billed
CREATE TABLE public.destaque_interacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destaque_id uuid NOT NULL REFERENCES public.destaques_vitrine(id) ON DELETE CASCADE,
  tipo text NOT NULL, -- clique, visualizacao
  ip_address text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.destaque_interacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert interactions" ON public.destaque_interacoes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Destaque owners can view interactions" ON public.destaque_interacoes
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM destaques_vitrine d WHERE d.id = destaque_id AND d.user_id = auth.uid()));

CREATE POLICY "Admins can view all interactions" ON public.destaque_interacoes
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE INDEX idx_destaques_vitrine_loja ON public.destaques_vitrine(loja_id);
CREATE INDEX idx_destaques_vitrine_active ON public.destaques_vitrine(ativo, data_inicio, data_fim);
CREATE INDEX idx_destaque_interacoes_destaque ON public.destaque_interacoes(destaque_id);
