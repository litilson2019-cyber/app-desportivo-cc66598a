-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_completo TEXT,
  saldo DECIMAL(10, 2) DEFAULT 0,
  plano_id UUID,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create planos table
CREATE TABLE IF NOT EXISTS public.planos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  preco DECIMAL(10, 2) NOT NULL,
  limite_construcoes INTEGER NOT NULL,
  limite_jogos INTEGER NOT NULL,
  acesso_mercados_avancados BOOLEAN DEFAULT false,
  verificacao_automatica BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;

-- RLS policies for planos (public read)
CREATE POLICY "Anyone can view planos"
  ON public.planos FOR SELECT
  USING (true);

-- Create bilhetes table
CREATE TABLE IF NOT EXISTS public.bilhetes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  jogos JSONB NOT NULL,
  mercados_recomendados JSONB,
  odds_totais DECIMAL(10, 4),
  analise_ia TEXT,
  probabilidade_estimada DECIMAL(5, 2),
  status TEXT DEFAULT 'pendente',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.bilhetes ENABLE ROW LEVEL SECURITY;

-- RLS policies for bilhetes
CREATE POLICY "Users can view own bilhetes"
  ON public.bilhetes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bilhetes"
  ON public.bilhetes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bilhetes"
  ON public.bilhetes FOR UPDATE
  USING (auth.uid() = user_id);

-- Create transacoes table
CREATE TABLE IF NOT EXISTS public.transacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'pendente',
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.transacoes ENABLE ROW LEVEL SECURITY;

-- RLS policies for transacoes
CREATE POLICY "Users can view own transacoes"
  ON public.transacoes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transacoes"
  ON public.transacoes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create investimentos_ativos table
CREATE TABLE IF NOT EXISTS public.investimentos_ativos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nome_plano TEXT NOT NULL,
  dias_restantes INTEGER NOT NULL,
  retorno_diario DECIMAL(10, 2) NOT NULL,
  valor_investido DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.investimentos_ativos ENABLE ROW LEVEL SECURITY;

-- RLS policies for investimentos_ativos
CREATE POLICY "Users can view own investimentos"
  ON public.investimentos_ativos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own investimentos"
  ON public.investimentos_ativos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own investimentos"
  ON public.investimentos_ativos FOR UPDATE
  USING (auth.uid() = user_id);

-- Add foreign key constraint for plano_id in profiles
ALTER TABLE public.profiles
ADD CONSTRAINT fk_plano
FOREIGN KEY (plano_id) REFERENCES public.planos(id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome_completo, saldo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome_completo', 'Investidor'),
    0
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Insert default planos
INSERT INTO public.planos (nome, descricao, preco, limite_construcoes, limite_jogos, acesso_mercados_avancados, verificacao_automatica)
VALUES 
  ('Gratuito', 'Plano básico para começar', 0, 3, 3, false, false),
  ('Básico', 'Ideal para iniciantes', 2500, 10, 5, false, true),
  ('Avançado', 'Para investidores profissionais', 5000, 50, 10, true, true)
ON CONFLICT DO NOTHING;