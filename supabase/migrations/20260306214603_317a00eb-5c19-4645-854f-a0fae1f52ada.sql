
-- Lojas (Commercial profiles / stores)
CREATE TABLE public.lojas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  logo_url TEXT,
  bio TEXT,
  contacto_whatsapp TEXT,
  contacto_outro TEXT,
  ativo BOOLEAN DEFAULT true,
  verificado BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.lojas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active lojas" ON public.lojas FOR SELECT USING (ativo = true);
CREATE POLICY "Users can insert own loja" ON public.lojas FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own loja" ON public.lojas FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all lojas" ON public.lojas FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Produtos (Products in stores)
CREATE TABLE public.produtos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco NUMERIC DEFAULT 0,
  contacto_link TEXT,
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active produtos" ON public.produtos FOR SELECT USING (ativo = true);
CREATE POLICY "Store owners can insert produtos" ON public.produtos FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.lojas WHERE id = loja_id AND user_id = auth.uid()));
CREATE POLICY "Store owners can update produtos" ON public.produtos FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.lojas WHERE id = loja_id AND user_id = auth.uid()));
CREATE POLICY "Store owners can delete produtos" ON public.produtos FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.lojas WHERE id = loja_id AND user_id = auth.uid()));
CREATE POLICY "Admins can manage all produtos" ON public.produtos FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Produto Imagens
CREATE TABLE public.produto_imagens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  imagem_url TEXT NOT NULL,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.produto_imagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view produto imagens" ON public.produto_imagens FOR SELECT USING (true);
CREATE POLICY "Store owners can insert produto imagens" ON public.produto_imagens FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.produtos p JOIN public.lojas l ON p.loja_id = l.id WHERE p.id = produto_id AND l.user_id = auth.uid()));
CREATE POLICY "Store owners can delete produto imagens" ON public.produto_imagens FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.produtos p JOIN public.lojas l ON p.loja_id = l.id WHERE p.id = produto_id AND l.user_id = auth.uid()));
CREATE POLICY "Admins can manage produto imagens" ON public.produto_imagens FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Anuncios Marketplace
CREATE TABLE public.anuncios_marketplace (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL DEFAULT 'outros',
  titulo TEXT NOT NULL,
  descricao TEXT,
  preco NUMERIC DEFAULT 0,
  localizacao TEXT,
  contacto_link TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.anuncios_marketplace ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active anuncios" ON public.anuncios_marketplace FOR SELECT USING (ativo = true);
CREATE POLICY "Users can insert own anuncios" ON public.anuncios_marketplace FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own anuncios" ON public.anuncios_marketplace FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own anuncios" ON public.anuncios_marketplace FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all anuncios" ON public.anuncios_marketplace FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Anuncio Imagens
CREATE TABLE public.anuncio_imagens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  anuncio_id UUID NOT NULL REFERENCES public.anuncios_marketplace(id) ON DELETE CASCADE,
  imagem_url TEXT NOT NULL,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.anuncio_imagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view anuncio imagens" ON public.anuncio_imagens FOR SELECT USING (true);
CREATE POLICY "Owners can insert anuncio imagens" ON public.anuncio_imagens FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.anuncios_marketplace WHERE id = anuncio_id AND user_id = auth.uid()));
CREATE POLICY "Owners can delete anuncio imagens" ON public.anuncio_imagens FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.anuncios_marketplace WHERE id = anuncio_id AND user_id = auth.uid()));
CREATE POLICY "Admins can manage anuncio imagens" ON public.anuncio_imagens FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Storage bucket for marketplace images
INSERT INTO storage.buckets (id, name, public) VALUES ('marketplace', 'marketplace', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated can upload marketplace" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'marketplace');
CREATE POLICY "Authenticated can update marketplace" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'marketplace');
CREATE POLICY "Authenticated can delete own marketplace" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'marketplace');
CREATE POLICY "Anyone can view marketplace" ON storage.objects FOR SELECT USING (bucket_id = 'marketplace');
