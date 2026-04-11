
-- Create artista_musicas table
CREATE TABLE public.artista_musicas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artista_id UUID NOT NULL REFERENCES public.artistas(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  preco NUMERIC NOT NULL DEFAULT 0,
  audio_url TEXT,
  preview_url TEXT,
  external_link TEXT,
  contacto_link TEXT,
  duracao_preview INTEGER DEFAULT 30,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.artista_musicas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active musicas"
ON public.artista_musicas FOR SELECT
USING (ativo = true);

CREATE POLICY "Artists can insert own musicas"
ON public.artista_musicas FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM artistas WHERE artistas.id = artista_musicas.artista_id AND artistas.user_id = auth.uid()
));

CREATE POLICY "Artists can update own musicas"
ON public.artista_musicas FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM artistas WHERE artistas.id = artista_musicas.artista_id AND artistas.user_id = auth.uid()
));

CREATE POLICY "Artists can delete own musicas"
ON public.artista_musicas FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM artistas WHERE artistas.id = artista_musicas.artista_id AND artistas.user_id = auth.uid()
));

CREATE POLICY "Admins can manage all musicas"
ON public.artista_musicas FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Storage bucket for audio files
INSERT INTO storage.buckets (id, name, public) VALUES ('musicas', 'musicas', true);

CREATE POLICY "Anyone can view musicas files"
ON storage.objects FOR SELECT
USING (bucket_id = 'musicas');

CREATE POLICY "Authenticated users can upload musicas"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'musicas');

CREATE POLICY "Users can delete own musicas files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'musicas');
