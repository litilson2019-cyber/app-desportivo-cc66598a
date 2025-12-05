-- Tabela para configurações do sistema
CREATE TABLE public.configuracoes_sistema (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL UNIQUE,
  valor text,
  descricao text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Inserir configurações padrão
INSERT INTO public.configuracoes_sistema (chave, valor, descricao) VALUES
  ('preco_modo_arriscado', '300', 'Preço do bilhete no Modo Arriscado (Kz)'),
  ('preco_modo_seguro', '500', 'Preço do bilhete no Modo Seguro (Kz)'),
  ('limite_jogos_arriscado', '5', 'Limite de jogos no Modo Arriscado'),
  ('limite_jogos_seguro', '3', 'Limite de jogos no Modo Seguro'),
  ('deposito_minimo', '1000', 'Valor mínimo de depósito (Kz)'),
  ('deposito_maximo', '500000', 'Valor máximo de depósito (Kz)');

-- Tabela para banners
CREATE TABLE public.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text,
  descricao text,
  imagem_url text NOT NULL,
  link text,
  ordem integer DEFAULT 0,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Tabela para logs de auditoria administrativa
CREATE TABLE public.admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  acao text NOT NULL,
  detalhes jsonb,
  ip_address text,
  created_at timestamp with time zone DEFAULT now()
);

-- Tabela para métodos de depósito
CREATE TABLE public.metodos_deposito (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo text NOT NULL, -- 'banco' ou 'express'
  iban text,
  numero_express text,
  ativo boolean DEFAULT true,
  ordem integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Inserir métodos padrão
INSERT INTO public.metodos_deposito (nome, tipo, iban, ativo, ordem) VALUES
  ('BFA', 'banco', 'AO06.0006.0000.0000.0000.0000.1', true, 1),
  ('BAI', 'banco', 'AO06.0004.0000.0000.0000.0000.2', true, 2),
  ('BIC', 'banco', 'AO06.0005.0000.0000.0000.0000.3', true, 3),
  ('Atlântico', 'banco', 'AO06.0007.0000.0000.0000.0000.4', true, 4);

INSERT INTO public.metodos_deposito (nome, tipo, numero_express, ativo, ordem) VALUES
  ('Multicaixa Express', 'express', '923000000', true, 5);

-- Enable RLS
ALTER TABLE public.configuracoes_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metodos_deposito ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para configuracoes_sistema
CREATE POLICY "Admins can manage configuracoes" ON public.configuracoes_sistema
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view configuracoes" ON public.configuracoes_sistema
  FOR SELECT USING (true);

-- Políticas RLS para banners
CREATE POLICY "Admins can manage banners" ON public.banners
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active banners" ON public.banners
  FOR SELECT USING (ativo = true);

-- Políticas RLS para admin_logs
CREATE POLICY "Admins can view logs" ON public.admin_logs
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert logs" ON public.admin_logs
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Políticas RLS para metodos_deposito
CREATE POLICY "Admins can manage metodos" ON public.metodos_deposito
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active metodos" ON public.metodos_deposito
  FOR SELECT USING (ativo = true);