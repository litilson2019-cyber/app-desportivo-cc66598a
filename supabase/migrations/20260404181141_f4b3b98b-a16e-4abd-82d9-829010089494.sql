
-- Add wallet_bonus_balance to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wallet_bonus_balance numeric DEFAULT 0;

-- Promotion links table
CREATE TABLE public.divulgacao_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tipo text NOT NULL DEFAULT 'produto',
  item_id uuid NOT NULL,
  codigo text NOT NULL UNIQUE,
  comissao_percentual numeric NOT NULL DEFAULT 5,
  cliques integer NOT NULL DEFAULT 0,
  conversoes integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.divulgacao_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own links" ON public.divulgacao_links FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own links" ON public.divulgacao_links FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own links" ON public.divulgacao_links FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all links" ON public.divulgacao_links FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Click tracking table
CREATE TABLE public.divulgacao_cliques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid NOT NULL REFERENCES public.divulgacao_links(id) ON DELETE CASCADE,
  ip_address text,
  user_agent text,
  referrer_user_id uuid,
  convertido boolean DEFAULT false,
  valor_comissao numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.divulgacao_cliques ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Link owners can view clicks" ON public.divulgacao_cliques FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.divulgacao_links dl WHERE dl.id = link_id AND dl.user_id = auth.uid()));
CREATE POLICY "Anyone can insert clicks" ON public.divulgacao_cliques FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view all clicks" ON public.divulgacao_cliques FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Commissions history table
CREATE TABLE public.divulgacao_comissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid REFERENCES public.divulgacao_links(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente',
  item_tipo text,
  item_id uuid,
  descricao text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.divulgacao_comissoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own commissions" ON public.divulgacao_comissoes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert commissions" ON public.divulgacao_comissoes FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage all commissions" ON public.divulgacao_comissoes FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Function to generate unique promo code
CREATE OR REPLACE FUNCTION public.generate_promo_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code text;
  exists_flag boolean;
BEGIN
  LOOP
    code := 'P' || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 7));
    SELECT EXISTS(SELECT 1 FROM public.divulgacao_links WHERE codigo = code) INTO exists_flag;
    EXIT WHEN NOT exists_flag;
  END LOOP;
  RETURN code;
END;
$$;
