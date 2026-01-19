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
      ? "Sugestão – Modo Seguro (Mercado estatístico estável)"
      : "Sugestão – Modo Risco (Mercado de alto retorno)";

  const regrasModo =
    modo === "seguro"
      ? `MODO SEGURO (máxima estabilidade, menor risco) – REGRAS OBRIGATÓRIAS:

🚫 MERCADOS PROIBIDOS (NUNCA sugerir no Modo Seguro):
- Resultado Final (1X2 / Vitória Casa / Vitória Fora / Empate)
- Ambas Marcam (Sim/Não)
- Empate Anula Aposta
- Primeira Equipa a Marcar
- Total de Golos Exato
- Parte com Mais Golos

✅ PRIORIDADE DE SELEÇÃO (seguir esta ordem obrigatória):

1️⃣ MERCADOS CONJUNTOS (prioridade máxima):
   - Total de golos do jogo (Over 0.5, Over 1.5)
   - Total de cantos do jogo
   - Total de cartões (amarelos/vermelhos)
   - Golos na 1ª parte ou 2ª parte
   - Remates totais
   - Fora de jogo totais
   - Minuto do primeiro golo

2️⃣ APENAS se nenhum mercado conjunto for válido (>=70%):
   - Total de golos da equipa FAVORITA (ex: "Team A - Over 0.5")
   - Resultado da 1ª parte (favorita a ganhar)
   - Resultado da 2ª parte (favorita a ganhar)

CRITÉRIOS FINAIS:
- Selecionar SEMPRE a ODD MAIS BAIXA disponível dentro dos mercados permitidos.
- Priorizar Over 0.5 ou Over 1.5 (Total do jogo).
- O modo seguro favorece ESTABILIDADE ESTATÍSTICA, não o vencedor.
- Faixa alvo de odds: 1.01–1.50 (priorizar as mais baixas).`
      : `MODO RISCO (maior retorno com risco controlado) – REGRAS OBRIGATÓRIAS:

✅ MERCADOS PERMITIDOS (usar APENAS estes):
- Ambas Equipas Marcam (Sim ou Não)
- Empate Anula Aposta
- Parte com Mais Golos
- Primeira Equipa a Marcar
- Resultado do Jogo (1X2)
- Total de Golos Exato

CRITÉRIOS FINAIS:
- Selecionar ODD MÉDIA do mercado (nunca a mais baixa, nunca a mais alta).
- PROIBIDO repetir qualquer mercado que seria usado no Modo Seguro.
- Priorizar jogos equilibrados ou de alta intensidade ofensiva.
- Faixa alvo de odds: 1.40–3.00 (priorizar odds médias).
- Se sugerires mercado por equipa, TEM de ser a EQUIPA FAVORITA.`;

  return `És um analista de apostas desportivas especializado. NÃO mostres cálculos internos.

REGRAS GERAIS (ambos os modos):
- Analisar TODOS os mercados disponíveis do jogo.
- Calcular probabilidade estimada para cada mercado.
- Apenas sugerir mercados com probabilidade >= 70%.
- Mostrar apenas UMA sugestão por jogo.
- NUNCA repetir o mesmo mercado nos dois modos.
- Se não houver mercado válido, usar motivo: "Sem sugestão segura para este jogo".

${regrasModo}

CONTROLO DE ERROS (validar antes de responder):
- Se Modo Seguro sugerir Resultado Final (1X2), INVALIDAR e escolher outro.
- Se Modo Seguro sugerir odd maior que outra disponível no mesmo mercado, INVALIDAR.
- Se os dois modos retornarem a mesma sugestão, INVALIDAR o Modo Risco e escolher outro.

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
