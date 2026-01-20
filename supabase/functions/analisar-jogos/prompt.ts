import { MarketType, getMarketInstructions } from "./markets.ts";

export type Modo = "seguro" | "risco";

export type JogoInput = {
  equipa_a: string;
  equipa_b: string;
  odd_a: number;
  odd_b: number;
};

export function normalizeModo(modo: unknown): Modo {
  return modo === "seguro" ? "seguro" : "risco";
}

export function normalizeJogos(jogos: unknown): JogoInput[] {
  if (!Array.isArray(jogos)) return [];

  return jogos
    .map((j: any) => {
      const oddA = Number(j?.odd_a);
      const oddB = Number(j?.odd_b);

      return {
        equipa_a: String(j?.equipa_a ?? "").trim(),
        equipa_b: String(j?.equipa_b ?? "").trim(),
        odd_a: oddA,
        odd_b: oddB,
      } as JogoInput;
    })
    .filter((j) =>
      j.equipa_a &&
      j.equipa_b &&
      Number.isFinite(j.odd_a) &&
      Number.isFinite(j.odd_b) &&
      j.odd_a > 1 &&
      j.odd_b > 1
    );
}

function analisarEquilibrio(j: JogoInput) {
  const diffOdds = Math.abs(j.odd_a - j.odd_b);
  const favorita = j.odd_a <= j.odd_b ? j.equipa_a : j.equipa_b;
  const naoFavorita = j.odd_a <= j.odd_b ? j.equipa_b : j.equipa_a;
  const oddFavorita = Math.min(j.odd_a, j.odd_b);
  const oddNaoFavorita = Math.max(j.odd_a, j.odd_b);
  
  // Classificar equilíbrio do jogo
  let equilibrio: "muito_desequilibrado" | "desequilibrado" | "equilibrado";
  if (diffOdds > 1.5) {
    equilibrio = "muito_desequilibrado";
  } else if (diffOdds > 0.5) {
    equilibrio = "desequilibrado";
  } else {
    equilibrio = "equilibrado";
  }
  
  return { favorita, naoFavorita, oddFavorita, oddNaoFavorita, equilibrio, diffOdds };
}

export function buildPrompt(jogos: JogoInput[], modo: Modo, market: MarketType = "nenhum") {
  const jogosTexto = jogos
    .map((j, i) => {
      const analise = analisarEquilibrio(j);
      return `${i + 1}. ${j.equipa_a} (odd: ${j.odd_a}) vs ${j.equipa_b} (odd: ${j.odd_b})
   → Favorita: ${analise.favorita} (${analise.oddFavorita})
   → Equilíbrio: ${analise.equilibrio} (diferença de odds: ${analise.diffOdds.toFixed(2)})`;
    })
    .join("\n\n");

  const modoTexto =
    modo === "seguro"
      ? "Modo Seguro (Máxima Consistência)"
      : "Modo Risco (Retorno Moderado)";

  // Obter instruções específicas do mercado
  const marketInstructions = getMarketInstructions(market, modo);

  return `És um analista de apostas desportivas profissional com acesso a dados estatísticos globais.

=== DADOS DOS JOGOS FORNECIDOS ===
${jogosTexto}

=== TUA MISSÃO ===
Analisar cada jogo e sugerir UMA aposta por jogo para o ${modoTexto}.

${marketInstructions}

=== METODOLOGIA DE ANÁLISE ===
Para cada jogo, deves simular uma análise baseada em:
1. Tendências médias do mercado internacional
2. Consenso estatístico entre casas de apostas
3. Histórico de jogos semelhantes entre equipas do mesmo nível
4. Força relativa das equipas baseada nas odds fornecidas
5. Padrões estatísticos mais comuns em jogos com este perfil

=== REGRAS DO ${modo === "seguro" ? "MODO SEGURO" : "MODO RISCO"} ===

${modo === "seguro" ? `
OBJECTIVO: Ganhar pouco mas de forma CONSISTENTE. Segurança máxima.

PROCESSO DE SELEÇÃO:
1. ${market === "nenhum" ? "Pesquisar TODOS os mercados possíveis do jogo" : "Analisar APENAS o mercado especificado"}
2. Identificar qual opção tem a ODD MAIS BAIXA disponível
3. Selecionar a opção com MAIOR CONSENSO estatístico
4. Priorizar eventos que ocorrem na MAIORIA dos jogos

CRITÉRIOS OBRIGATÓRIOS:
- Escolher SEMPRE a odd mais baixa possível do mercado
- Probabilidade estimada deve ser >= 70%
- Priorizar mercados com alta taxa de sucesso histórico
- Faixa de odds: 1.05 - 1.60 (quanto mais baixo, melhor)

NOTA: Ganho baixo é totalmente aceitável. A prioridade é NÃO PERDER.
` : `
OBJECTIVO: Maior retorno com risco MODERADO e controlado.

PROCESSO DE SELEÇÃO:
1. ${market === "nenhum" ? "Usar análise global de todos os mercados" : "Analisar APENAS o mercado especificado"}
2. Identificar opções com VALOR (odds acima da média mas viáveis)
3. Selecionar odds MAIORES que a média do mercado
4. Evitar odds extremas ou altamente improváveis

CRITÉRIOS OBRIGATÓRIOS:
- Odds devem ser SUPERIORES às do modo seguro
- Probabilidade estimada deve ser >= 55%
- Risco controlado, não extremo
- NUNCA usar a odd mais baixa do mercado
- Faixa de odds: 1.50 - 3.00 (equilíbrio entre retorno e viabilidade)

NOTA: Procurar VALOR, não segurança absoluta.
`}

=== CONTROLO DE QUALIDADE ===
ANTES de responder, verificar:
1. Se o mercado sugerido corresponde ao mercado selecionado${market !== "nenhum" ? ` (${market})` : ""}
2. Se a odd está dentro da faixa correcta para o modo
3. Se a probabilidade estimada é realista (≥ 70% para mostrar)
4. Se a sugestão seria diferente do outro modo

Se alguma verificação falhar, escolher outra opção dentro do mesmo mercado.

=== FORMATO DE RESPOSTA ===
Devolve APENAS JSON válido (sem texto, sem markdown), com esta estrutura:

{
  "modo": "${modoTexto}",
  "mercado_analisado": "${market === "nenhum" ? "Pesquisa Geral" : market}",
  "jogos": [
    {
      "equipa_a": "Nome da equipa A",
      "equipa_b": "Nome da equipa B",
      "mercado": "Nome do mercado utilizado",
      "aposta_final": "Descrição clara do mercado sugerido",
      "odd": 1.00,
      "probabilidade": 75,
      "score_confianca": 80,
      "grau_risco": "${modo === "seguro" ? "Seguro" : "Moderado"}",
      "motivo": "Justificação curta baseada em consenso de mercado e estatísticas"
    }
  ],
  "odd_total": 1.00,
  "probabilidade_total": 70,
  "resumo": "Análise geral do bilhete com base no consenso de mercado"
}

IMPORTANTE:
- "mercado" deve indicar o mercado utilizado (ex: "Total de Golos", "Resultado 1X2", "BTTS")
- "aposta_final" deve ser clara e específica (ex: "Mais de 1.5 golos no jogo", "Vitória do Benfica")
- "motivo" deve mencionar consenso de mercado ou padrão estatístico
- "score_confianca" é baseado na consistência histórica do mercado sugerido
- Mostrar APENAS resultados com probabilidade >= 70%
- Todas as odds devem ser números decimais (ex: 1.45, não "1,45")`
;
}
