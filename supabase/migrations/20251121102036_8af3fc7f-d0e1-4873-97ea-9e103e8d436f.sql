-- Add modo field to bilhetes table to track betting mode
ALTER TABLE public.bilhetes 
ADD COLUMN IF NOT EXISTS modo text CHECK (modo IN ('risco', 'seguro'));

-- Add index for better performance on modo queries
CREATE INDEX IF NOT EXISTS idx_bilhetes_modo ON public.bilhetes(modo);
CREATE INDEX IF NOT EXISTS idx_bilhetes_user_id_modo ON public.bilhetes(user_id, modo);