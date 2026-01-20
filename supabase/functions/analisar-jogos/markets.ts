export type MarketType = 
  | "nenhum"
  | "resultado"
  | "total_golos"
  | "btts"
  | "handicap"
  | "partes"
  | "minuto_golo"
  | "remates"
  | "faltas"
  | "resultado_exato";

export function normalizeMarket(market: unknown): MarketType {
  const validMarkets: MarketType[] = [
    "nenhum", "resultado", "total_golos", "btts", "handicap",
    "partes", "minuto_golo", "remates", "faltas", "resultado_exato"
  ];
  
  if (typeof market === "string" && validMarkets.includes(market as MarketType)) {
    return market as MarketType;
  }
  
  return "nenhum";
}

export function getMarketInstructions(market: MarketType, modo: "seguro" | "risco"): string {
  const modoLabel = modo === "seguro" ? "Modo Seguro" : "Modo Risco";
  
  switch (market) {
    case "nenhum":
      return `
=== PESQUISA GERAL AUTOMÁTICA ===
Como nenhum mercado foi especificado, deves:
1. Avaliar TODOS os mercados disponíveis para cada jogo
2. Selecionar automaticamente o mercado mais favorável
3. Escolher o resultado mais confiável com maior percentagem
4. Mostrar apenas resultados com probabilidade ≥ 70%
5. O sistema decide o melhor mercado e sugestão para ${modoLabel}`;

    case "resultado":
      return `
=== MERCADO: RESULTADO DO JOGO ===
Analisar EXCLUSIVAMENTE:
- Resultado Final (1X2): Vitória Equipa 1, Empate, ou Vitória Equipa 2
- Dupla Chance: 1X (Equipa 1 ganha ou empata) ou X2 (Equipa 2 ganha ou empata)

REGRA: Não analisar outros mercados. Sugerir apenas 1X2 ou Dupla Chance.
Mostrar probabilidade para cada opção e sugerir a mais confiável para ${modoLabel}.`;

    case "total_golos":
      return `
=== MERCADO: TOTAL DE GOLOS ===
Analisar EXCLUSIVAMENTE o total de golos no jogo.

Linhas a considerar (Mais e Menos para cada):
- Mais de 0.5 / Menos de 0.5
- Mais de 1.5 / Menos de 1.5
- Mais de 2.5 / Menos de 2.5
- Mais de 3.5 / Menos de 3.5
- Mais de 4.5 / Menos de 4.5

REGRA: Calcular probabilidade para cada linha. Mostrar apenas as linhas com ≥ 70%.
Sugerir a linha mais confiável para ${modoLabel}.`;

    case "btts":
      return `
=== MERCADO: AMBAS MARCAM (BTTS) ===
Analisar EXCLUSIVAMENTE se ambas as equipas irão marcar.

Opções:
- Sim: Ambas as equipas marcam pelo menos 1 golo
- Não: Pelo menos uma equipa não marca

REGRA: Determinar qual opção tem maior confiança para ${modoLabel}.
Mostrar apenas a opção com maior probabilidade.`;

    case "handicap":
      return `
=== MERCADO: HANDICAP ===
Analisar EXCLUSIVAMENTE handicaps para ${modoLabel}.

Tipos de handicap a considerar:
- Handicap Europeu: -1, -2, +1, +2
- Handicap Asiático: -0.5, -1.5, +0.5, +1.5

REGRA: Indicar claramente:
- A equipa afetada
- O valor do handicap (ex: Porto -1, Benfica +1.5)
- Mostrar apenas handicaps com probabilidade ≥ 70%`;

    case "partes":
      return `
=== MERCADO: PARTES DO JOGO ===
Analisar EXCLUSIVAMENTE os resultados por partes.

Mercados:
- Resultado da Primeira Parte (1X2)
- Resultado da Segunda Parte (1X2)

REGRA: Análise separada para cada parte.
Sugerir a parte e resultado com maior confiança para ${modoLabel}.`;

    case "minuto_golo":
      return `
=== MERCADO: MINUTO DO PRIMEIRO GOLO ===
Analisar EXCLUSIVAMENTE quando será marcado o primeiro golo.

Intervalos a considerar:
- 1-10 minutos
- 11-20 minutos
- 21-30 minutos
- Após 30 minutos
- Sem golos na 1ª parte

REGRA: Mostrar apenas previsões com alta confiança (≥ 75%).
Indicar o intervalo mais provável para ${modoLabel}.`;

    case "remates":
      return `
=== MERCADO: REMATES ===
Analisar EXCLUSIVAMENTE estatísticas de remates para ${modoLabel}.

📊 REMATES DA EQUIPA 1 (Casa):
- Analisar média de remates por jogo em casa
- Linhas: Mais/Menos de 3.5, 4.5, 5.5, 6.5 remates
- Indicar a linha mais provável com percentagem

📊 REMATES DA EQUIPA 2 (Fora):
- Analisar média de remates por jogo fora
- Linhas: Mais/Menos de 3.5, 4.5, 5.5, 6.5 remates
- Indicar a linha mais provável com percentagem

📊 REMATES TOTAIS DO JOGO:
- Somar expectativa de remates das duas equipas
- Linhas: Mais/Menos de 18.5, 20.5, 22.5, 24.5 remates totais
- Indicar a linha mais provável com percentagem

REGRA CRÍTICA:
- Basear análise no estilo de jogo (ofensivo/defensivo)
- Considerar a qualidade das defesas adversárias
- Apresentar valores estimados com probabilidade ≥ 70%
- Formato sugestão: "Equipa X Mais de Y.5 remates" ou "Total Mais de X.5 remates"`;

    case "faltas":
      return `
=== MERCADO: FALTAS ===
Analisar EXCLUSIVAMENTE estatísticas de faltas para ${modoLabel}.

📊 FALTAS DA EQUIPA 1 (Casa):
- Analisar média de faltas cometidas por jogo
- Considerar estilo de jogo e agressividade
- Linhas: Mais/Menos de 10.5, 12.5, 14.5, 16.5 faltas
- Indicar a linha mais provável com percentagem

📊 FALTAS DA EQUIPA 2 (Fora):
- Analisar média de faltas cometidas fora
- Equipas visitantes geralmente cometem mais faltas
- Linhas: Mais/Menos de 10.5, 12.5, 14.5, 16.5 faltas
- Indicar a linha mais provável com percentagem

📊 TOTAL DE FALTAS DO JOGO:
- Somar expectativa de faltas das duas equipas
- Considerar intensidade esperada (derby, rivalidade, posição na tabela)
- Linhas: Mais/Menos de 20.5, 22.5, 24.5, 26.5, 28.5 faltas totais
- Indicar a linha mais provável com percentagem

REGRA CRÍTICA:
- Analisar o árbitro designado (se disponível) - árbitros rigorosos = mais faltas
- Considerar importância do jogo (jogos decisivos = mais intensidade)
- Apresentar valores estimados com probabilidade ≥ 70%
- Formato sugestão: "Total Mais de X.5 faltas" ou "Equipa X Mais de Y.5 faltas"`;

    case "resultado_exato":
      return `
=== MERCADO: RESULTADO EXACTO (ANÁLISE PROFUNDA) ===
Mercado avançado que requer análise estatística profunda para ${modoLabel}.

📊 PASSO 1 - QUANTOS GOLOS TERÁ O JOGO:
- Analisar média de golos por jogo de cada equipa
- Considerar força ofensiva e defensiva
- Estimar total de golos esperado no jogo

📊 PASSO 2 - GOLOS DA EQUIPA 1 (Casa):
- Analisar golos marcados em casa (últimos 5 jogos)
- Analisar golos sofridos pela Equipa 2 fora (últimos 5 jogos)
- Estimar quantos golos a Equipa 1 marcará

📊 PASSO 3 - GOLOS DA EQUIPA 2 (Fora):
- Analisar golos marcados fora (últimos 5 jogos)
- Analisar golos sofridos pela Equipa 1 em casa (últimos 5 jogos)
- Estimar quantos golos a Equipa 2 marcará

📊 PASSO 4 - RESULTADO EXACTO:
- Combinar as estimativas para determinar placares prováveis
- Calcular probabilidade para cada placar
- Selecionar os 1-2 resultados mais prováveis

REGRA CRÍTICA:
- Sugerir NO MÁXIMO 2 resultados exatos
- Apenas resultados com probabilidade ≥ 65%
- Mostrar a análise que justifica cada sugestão
- Formato: "Resultado Exacto: X-Y (Equipa1 X - Equipa2 Y)" com probabilidade
- Exemplos: "1-0", "2-1", "1-1", "2-0", "0-0"
- Indicar claramente qual é a MELHOR APOSTA`;

    default:
      return "";
  }
}
