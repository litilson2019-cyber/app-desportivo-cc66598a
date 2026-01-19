-- Adicionar configurações de bónus de depósito e indicação
INSERT INTO configuracoes_sistema (chave, valor, descricao) VALUES 
  ('bonus_deposito_ativo', 'true', 'Ativar bónus de depósito'),
  ('bonus_deposito_tipo', 'percentagem', 'Tipo de bónus de depósito (valor_fixo ou percentagem)'),
  ('bonus_deposito_valor', '10', 'Valor do bónus de depósito (Kz ou %)'),
  ('bonus_indicacao_ativo', 'true', 'Ativar bónus de indicação'),
  ('bonus_indicacao_tipo', 'percentagem', 'Tipo de bónus de indicação (valor_fixo ou percentagem)'),
  ('bonus_indicacao_valor', '5', 'Valor do bónus de indicação (Kz ou %)')
ON CONFLICT (chave) DO NOTHING;