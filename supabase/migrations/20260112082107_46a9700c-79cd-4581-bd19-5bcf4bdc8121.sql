-- Add columns for bank account holder info to metodos_deposito
ALTER TABLE public.metodos_deposito 
ADD COLUMN IF NOT EXISTS titular_conta text,
ADD COLUMN IF NOT EXISTS duracao_exibicao integer DEFAULT 5;

-- Add duration column to banners table for carousel timing
ALTER TABLE public.banners
ADD COLUMN IF NOT EXISTS duracao_segundos integer DEFAULT 5;