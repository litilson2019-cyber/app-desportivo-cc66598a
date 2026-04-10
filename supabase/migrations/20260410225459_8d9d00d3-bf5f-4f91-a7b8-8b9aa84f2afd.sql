CREATE TABLE public.artista_galeria (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artista_id uuid NOT NULL REFERENCES public.artistas(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'foto',
  url text NOT NULL,
  titulo text DEFAULT NULL,
  ordem integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.artista_galeria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view gallery items"
ON public.artista_galeria FOR SELECT
USING (true);

CREATE POLICY "Artists can insert own gallery items"
ON public.artista_galeria FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.artistas
    WHERE artistas.id = artista_galeria.artista_id
    AND artistas.user_id = auth.uid()
  )
);

CREATE POLICY "Artists can update own gallery items"
ON public.artista_galeria FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.artistas
    WHERE artistas.id = artista_galeria.artista_id
    AND artistas.user_id = auth.uid()
  )
);

CREATE POLICY "Artists can delete own gallery items"
ON public.artista_galeria FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.artistas
    WHERE artistas.id = artista_galeria.artista_id
    AND artistas.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all gallery items"
ON public.artista_galeria FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_galeria_artista ON public.artista_galeria(artista_id, ordem);