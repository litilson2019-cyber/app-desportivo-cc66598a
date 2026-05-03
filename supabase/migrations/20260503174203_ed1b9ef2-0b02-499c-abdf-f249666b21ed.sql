ALTER TABLE public.odds_casas
  ADD COLUMN IF NOT EXISTS odd_over_25 numeric,
  ADD COLUMN IF NOT EXISTS odd_under_25 numeric,
  ADD COLUMN IF NOT EXISTS odd_btts_sim numeric,
  ADD COLUMN IF NOT EXISTS odd_btts_nao numeric;