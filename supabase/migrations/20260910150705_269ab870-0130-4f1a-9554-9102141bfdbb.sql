ALTER TABLE public.banners
  ADD COLUMN IF NOT EXISTS data_inicio timestamptz,
  ADD COLUMN IF NOT EXISTS data_fim timestamptz;

DROP POLICY IF EXISTS "Anyone can view active banners" ON public.banners;
CREATE POLICY "Anyone can view active banners"
ON public.banners FOR SELECT
USING (
  ativo = true
  AND (data_inicio IS NULL OR data_inicio <= now())
  AND (data_fim IS NULL OR data_fim >= now())
);

CREATE POLICY "Managers can manage banners"
ON public.banners FOR ALL
TO authenticated
USING (public.has_permission(auth.uid(), 'configuracoes'))
WITH CHECK (public.has_permission(auth.uid(), 'configuracoes'));

GRANT SELECT ON public.banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banners TO authenticated;
GRANT ALL ON public.banners TO service_role;