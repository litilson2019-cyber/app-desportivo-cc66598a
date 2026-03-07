
-- Artist profiles table
CREATE TABLE public.artistas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome_artistico text NOT NULL,
  bio text,
  preco_album numeric DEFAULT 0,
  preco_base_atuacao numeric DEFAULT 0,
  cidade text,
  contacto text,
  tipo text NOT NULL DEFAULT 'independente', -- 'independente' or managed by produtora
  produtora_id uuid,
  percentagem_musico numeric DEFAULT 100,
  percentagem_produtora numeric DEFAULT 0,
  tipo_evento_permitido text,
  ativo boolean DEFAULT true,
  verificado boolean DEFAULT false,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Producer profiles table
CREATE TABLE public.produtoras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  nif text,
  contacto text,
  endereco text,
  responsavel text,
  logo_url text,
  bio text,
  ativo boolean DEFAULT true,
  verificado boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Performance/gig calculations history
CREATE TABLE public.calculos_atuacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artista_id uuid NOT NULL REFERENCES public.artistas(id) ON DELETE CASCADE,
  produtora_id uuid REFERENCES public.produtoras(id) ON DELETE SET NULL,
  valor_total numeric NOT NULL,
  percentagem_musico numeric NOT NULL,
  percentagem_produtora numeric NOT NULL,
  valor_musico numeric NOT NULL,
  valor_produtora numeric NOT NULL,
  tipo_evento text,
  descricao text,
  created_at timestamptz DEFAULT now()
);

-- Commercial plans for stores
CREATE TABLE public.planos_comerciais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  preco_mensal numeric NOT NULL DEFAULT 0,
  preco_anual numeric NOT NULL DEFAULT 0,
  selo_verificado boolean DEFAULT false,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Store subscriptions
CREATE TABLE public.subscricoes_loja (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  plano_id uuid NOT NULL REFERENCES public.planos_comerciais(id),
  tipo text NOT NULL DEFAULT 'mensal', -- 'mensal' or 'anual'
  data_inicio timestamptz NOT NULL DEFAULT now(),
  data_fim timestamptz NOT NULL,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Add foreign key for artistas.produtora_id
ALTER TABLE public.artistas ADD CONSTRAINT artistas_produtora_id_fkey FOREIGN KEY (produtora_id) REFERENCES public.produtoras(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.artistas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calculos_atuacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planos_comerciais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscricoes_loja ENABLE ROW LEVEL SECURITY;

-- RLS: artistas
CREATE POLICY "Anyone can view active artistas" ON public.artistas FOR SELECT USING (ativo = true);
CREATE POLICY "Users can insert own artista" ON public.artistas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own artista" ON public.artistas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all artistas" ON public.artistas FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Produtoras can manage their musicians" ON public.artistas FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.produtoras WHERE id = artistas.produtora_id AND user_id = auth.uid())
);

-- RLS: produtoras
CREATE POLICY "Anyone can view active produtoras" ON public.produtoras FOR SELECT USING (ativo = true);
CREATE POLICY "Users can insert own produtora" ON public.produtoras FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own produtora" ON public.produtoras FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all produtoras" ON public.produtoras FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS: calculos_atuacao
CREATE POLICY "Anyone can view calculos" ON public.calculos_atuacao FOR SELECT USING (true);
CREATE POLICY "Produtoras can insert calculos" ON public.calculos_atuacao FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.produtoras WHERE id = calculos_atuacao.produtora_id AND user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.artistas WHERE id = calculos_atuacao.artista_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can manage calculos" ON public.calculos_atuacao FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS: planos_comerciais
CREATE POLICY "Anyone can view active planos comerciais" ON public.planos_comerciais FOR SELECT USING (ativo = true);
CREATE POLICY "Admins can manage planos comerciais" ON public.planos_comerciais FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS: subscricoes_loja
CREATE POLICY "Users can view own subscricoes" ON public.subscricoes_loja FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.lojas WHERE id = subscricoes_loja.loja_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert own subscricoes" ON public.subscricoes_loja FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.lojas WHERE id = subscricoes_loja.loja_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can manage all subscricoes" ON public.subscricoes_loja FOR ALL USING (has_role(auth.uid(), 'admin'));
