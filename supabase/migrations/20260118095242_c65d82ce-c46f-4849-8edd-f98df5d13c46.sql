-- Enable realtime for system-wide settings and deposit methods
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.configuracoes_sistema;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.metodos_deposito;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
