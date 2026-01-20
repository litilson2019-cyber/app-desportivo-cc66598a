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
Analisar EXCLUSIVAMENTE estatísticas de remates.

Mercados:
- Remates Totais da Equipa 1 (Mais/Menos de X)
- Remates Totais da Equipa 2 (Mais/Menos de X)
- Remates Totais do Jogo (Mais/Menos de X)
- Remates à Baliza

REGRA: Apresentar valores estimados com percentagem.
Sugerir as linhas mais confiáveis para ${modoLabel}.`;

    case "faltas":
      return `
=== MERCADO: FALTAS ===
Analisar EXCLUSIVAMENTE estatísticas de faltas.

Mercados:
- Faltas da Equipa 1 (Mais/Menos de X)
- Faltas da Equipa 2 (Mais/Menos de X)
- Total de Faltas do Jogo (Mais/Menos de X)

REGRA: Considerar estilo de jogo e intensidade da partida.
Apresentar valores estimados com percentagem para ${modoLabel}.`;

    case "resultado_exato":
      return `
=== MERCADO: RESULTADO EXACTO (ANÁLISE PROFUNDA) ===
Mercado avançado que requer análise profunda.

Processo:
1. Analisar quantos golos terá o jogo no total
2. Analisar quantos golos marcará cada equipa
3. Determinar os resultados exatos mais prováveis

REGRA: 
- Sugerir NO MÁXIMO 2 resultados exatos
- Apenas se a percentagem for alta (≥ 65%)
- Indicar claramente a melhor aposta baseada na análise para ${modoLabel}
- Formato: "Resultado Exacto: X-Y" com probabilidade`;

    default:
      return "";
  }
}
