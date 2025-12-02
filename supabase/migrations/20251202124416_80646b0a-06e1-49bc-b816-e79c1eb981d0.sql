-- Add missing columns to transacoes table for deposit validation workflow
ALTER TABLE public.transacoes 
ADD COLUMN IF NOT EXISTS data_validacao timestamp with time zone,
ADD COLUMN IF NOT EXISTS validador_id uuid;

-- Add comment for clarity
COMMENT ON COLUMN public.transacoes.data_validacao IS 'Data em que o depósito foi validado (aprovado ou rejeitado)';
COMMENT ON COLUMN public.transacoes.validador_id IS 'ID do admin que validou o depósito';