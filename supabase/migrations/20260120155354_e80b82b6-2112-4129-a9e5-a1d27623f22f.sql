-- Adicionar configuração para desconto condicional de saldo
INSERT INTO public.configuracoes_sistema (chave, valor, descricao)
VALUES ('desconto_apenas_com_resultados', 'true', 'Descontar saldo apenas quando a análise retornar resultados')
ON CONFLICT (chave) DO NOTHING;