CREATE TABLE public.odds_favoritos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  jogo_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, jogo_id)
);

ALTER TABLE public.odds_favoritos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own favoritos" ON public.odds_favoritos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own favoritos" ON public.odds_favoritos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own favoritos" ON public.odds_favoritos FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_odds_favoritos_user ON public.odds_favoritos(user_id);