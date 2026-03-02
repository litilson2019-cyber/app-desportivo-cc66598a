
-- Add tipo_conta column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tipo_conta text DEFAULT 'user';

-- Add criado_por column to profiles (who created this employee)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS criado_por uuid;

-- Add ativo column to profiles for employee status
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;

-- Add telefone column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telefone text;

-- Insert missing team profiles
INSERT INTO public.team_profiles (nome, descricao, permissoes) VALUES
('Super Admin', 'Acesso total com controlo de funcionários', '{"dashboard":true,"depositos":true,"usuarios":true,"bilhetes":true,"configuracoes":true,"logs":true,"gerenciar_equipa":true}'::jsonb),
('Marketing e Publicidade', 'Gestão de banners e campanhas', '{"dashboard":true,"depositos":false,"usuarios":false,"bilhetes":false,"configuracoes":true,"logs":true,"gerenciar_equipa":false}'::jsonb),
('Financeiro', 'Gestão financeira e depósitos', '{"dashboard":true,"depositos":true,"usuarios":false,"bilhetes":false,"configuracoes":false,"logs":true,"gerenciar_equipa":false}'::jsonb),
('Suporte', 'Suporte ao usuário', '{"dashboard":false,"depositos":false,"usuarios":true,"bilhetes":true,"configuracoes":false,"logs":true,"gerenciar_equipa":false}'::jsonb)
ON CONFLICT DO NOTHING;

-- Update handle_new_user to include tipo_conta
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome_completo, email, saldo, tipo_conta)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome_completo', 'Investidor'),
    NEW.email,
    CASE WHEN COALESCE(NEW.raw_user_meta_data->>'tipo_conta', 'user') = 'user' THEN 0 ELSE 0 END,
    COALESCE(NEW.raw_user_meta_data->>'tipo_conta', 'user')
  );
  RETURN NEW;
END;
$$;
