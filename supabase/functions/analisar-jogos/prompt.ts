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

function getFavorita(j: JogoInput) {
  const favorita = j.odd_a <= j.odd_b ? j.equipa_a : j.equipa_b;
  const naoFavorita = j.odd_a <= j.odd_b ? j.equipa_b : j.equipa_a;
  const oddFavorita = Math.min(j.odd_a, j.odd_b);
  const oddNaoFavorita = Math.max(j.odd_a, j.odd_b);
  return { favorita, naoFavorita, oddFavorita, oddNaoFavorita };
}

export function buildPrompt(jogos: JogoInput[], modo: Modo) {
  const jogosTexto = jogos
    .map((j, i) => {
      const { favorita, naoFavorita, oddFavorita, oddNaoFavorita } = getFavorita(j);
      return `${i + 1}. ${j.equipa_a} (${j.odd_a}) vs ${j.equipa_b} (${j.odd_b}) | favorita: ${favorita} (${oddFavorita}) | não favorita: ${naoFavorita} (${oddNaoFavorita})`;
    })
    .join("\n");

  const modoTexto =
    modo === "seguro"
      ? "Sugestão – Modo Seguro (Odd mais baixa)"
      : "Sugestão – Modo Risco (Odd média)";

  const regrasModo =
    modo === "seguro"
      ? `MODO SEGURO (ultra conservador) – REGRA FINAL OBRIGATÓRIA:
- Considerar APENAS mercados com probabilidade estimada >= 70% e dados suficientes.
- Criar lista de mercados elegíveis e ORDENAR por ODD crescente.
- Escolher SEMPRE a ODD MAIS BAIXA elegível (o score é apenas filtro mínimo, não critério principal).
- PROIBIDO sugerir uma odd superior se existir odd mais baixa válida.
- Se sugerires mercado por equipa, TEM de ser a EQUIPA FAVORITA (odd mais baixa). Nunca sugerir a favor da não favorita.
- Se sugerires Over/Under, assume SEMPRE "Total do jogo" (ex: "Total do jogo - Over 0.5 golos"), nunca "equipa X marca +0.5".
- Faixa alvo: 1.01–1.50 (priorizar as mais baixas).`
      : `MODO RISCO (agressivo controlado) – REGRA FINAL OBRIGATÓRIA:
- Considerar APENAS mercados com probabilidade estimada >= 70% e dados suficientes.
- Criar lista de mercados elegíveis e ORDENAR por ODD crescente.
- EXCLUIR a odd mais baixa (essa é para o Modo Seguro).
- EXCLUIR odds extremas (remover a mais alta e ignorar odds > 3.00).
- Selecionar a ODD MÉDIA do conjunto restante.
  - Se sobrarem 0 mercados após exclusões, escolher a 2ª odd mais baixa (para garantir diferença do Seguro).
- PROIBIDO repetir a mesma sugestão/odd do Modo Seguro para o mesmo jogo.
- Se sugerires mercado por equipa, TEM de ser a EQUIPA FAVORITA (odd mais baixa). Nunca sugerir a favor da não favorita.
- Se sugerires Over/Under, assume SEMPRE "Total do jogo".
- Faixa alvo: 1.40–2.50 (priorizar odds médias).`;

  return `És um analista de apostas desportivas. NÃO mostres cálculos internos.

REGRAS GERAIS (para ambos):
- Analisar mercados disponíveis.
- Estimar probabilidade e filtrar APENAS >= 70%.
- Excluir mercados com dados insuficientes ou odds instáveis.

${regrasModo}

JOGOS:
${jogosTexto}

RESPOSTA: devolve APENAS JSON válido (sem texto extra, sem markdown), com esta estrutura exata:
{
  "modo": "${modoTexto}",
  "jogos": [
    {
      "equipa_a": "...",
      "equipa_b": "...",
      "aposta_final": "...",
      "odd": 1.00,
      "probabilidade": 70,
      "score_confianca": 70,
      "motivo": "..."
    }
  ],
  "odd_total": 1.00,
  "probabilidade_total": 70,
  "resumo": "..."
}`;
}
