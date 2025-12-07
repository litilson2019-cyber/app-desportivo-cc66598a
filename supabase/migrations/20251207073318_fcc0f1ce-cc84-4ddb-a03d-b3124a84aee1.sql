
-- Criar tabela de perfis da equipa administrativa
CREATE TABLE IF NOT EXISTS public.team_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  descricao text,
  permissoes jsonb NOT NULL DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_profiles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para team_profiles
CREATE POLICY "Admins can manage team profiles"
ON public.team_profiles
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view profiles"
ON public.team_profiles
FOR SELECT
TO authenticated
USING (true);

-- Adicionar coluna team_profile_id na tabela user_roles
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS team_profile_id uuid REFERENCES public.team_profiles(id);

-- Inserir perfis iniciais
INSERT INTO public.team_profiles (nome, descricao, permissoes) VALUES
(
  'Admin',
  'Acesso total a todas funcionalidades',
  '{
    "dashboard": true,
    "depositos": true,
    "usuarios": true,
    "bilhetes": true,
    "configuracoes": true,
    "logs": true,
    "gerenciar_equipa": true
  }'::jsonb
),
(
  'Gestor de Depósito',
  'Ver e gerenciar depósitos apenas',
  '{
    "dashboard": false,
    "depositos": true,
    "usuarios": false,
    "bilhetes": false,
    "configuracoes": false,
    "logs": true,
    "gerenciar_equipa": false
  }'::jsonb
)
ON CONFLICT (nome) DO NOTHING;

-- Criar função para verificar permissão específica
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.team_profiles tp ON ur.team_profile_id = tp.id
    WHERE ur.user_id = _user_id
      AND (tp.permissoes->>_permission)::boolean = true
  )
  OR has_role(_user_id, 'admin')
$$;

-- Atualizar user_roles existentes de admin para usar o perfil Admin
UPDATE public.user_roles 
SET team_profile_id = (SELECT id FROM public.team_profiles WHERE nome = 'Admin' LIMIT 1)
WHERE role = 'admin' AND team_profile_id IS NULL;

-- Enable realtime para transacoes para sincronização em tempo real
ALTER PUBLICATION supabase_realtime ADD TABLE public.transacoes;
