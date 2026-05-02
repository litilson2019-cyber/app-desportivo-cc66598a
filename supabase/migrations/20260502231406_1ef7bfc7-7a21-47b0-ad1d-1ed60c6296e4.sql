CREATE TABLE public.casas_apostas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.casas_apostas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage casas_apostas" ON public.casas_apostas
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_permission(auth.uid(), 'configuracoes'))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_permission(auth.uid(), 'configuracoes'));

CREATE POLICY "Authenticated view casas_apostas" ON public.casas_apostas
  FOR SELECT USING (auth.uid() IS NOT NULL);