
CREATE TABLE public.artista_avaliacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artista_id UUID NOT NULL REFERENCES public.artistas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  nota INTEGER NOT NULL CHECK (nota >= 1 AND nota <= 5),
  comentario TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(artista_id, user_id)
);

ALTER TABLE public.artista_avaliacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view avaliacoes"
  ON public.artista_avaliacoes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert own avaliacoes"
  ON public.artista_avaliacoes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own avaliacoes"
  ON public.artista_avaliacoes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own avaliacoes"
  ON public.artista_avaliacoes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all avaliacoes"
  ON public.artista_avaliacoes FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
