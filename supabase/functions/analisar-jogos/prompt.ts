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

⚠️ IMPORTANTE: Apenas sugerir mercados UNIVERSAIS que existem em 100% dos jogos.

🚫 MERCADOS PROIBIDOS (NUNCA sugerir no Modo Seguro):
- Resultado Final (1X2 / Vitória Casa / Vitória Fora / Empate)
- Ambas Marcam (Sim/Não)
- Empate Anula Aposta
- Primeira Equipa a Marcar
- Total de Golos Exato
- Parte com Mais Golos
- Mercados específicos de jogador
- Mercados de handicap

✅ MERCADOS PERMITIDOS (garantidos em todos os jogos):
1️⃣ Total de Golos do Jogo (PRIORIDADE MÁXIMA):
   - "Mais de 1.5 golos no jogo" (Over 1.5) – odd ~1.20-1.40
   - "Mais de 2.5 golos no jogo" (Over 2.5) – odd ~1.50-1.80
   
2️⃣ Golos por Parte (sempre disponível):
   - "Golo na 2ª parte" – odd ~1.10-1.30
   - "Mais de 0.5 golos na 2ª parte" – odd ~1.10-1.25

3️⃣ Resultado Dupla Hipótese (sempre disponível):
   - "Favorita não perde (1X ou X2)" – odd ~1.15-1.35

CRITÉRIOS FINAIS:
- Priorizar "Mais de 1.5 golos no jogo" como sugestão padrão (existe SEMPRE).
- Selecionar SEMPRE a ODD MAIS BAIXA dentro dos mercados permitidos.
- Faixa alvo de odds: 1.15–1.50 (evitar odds abaixo de 1.15 por margem de erro).
- NÃO sugerir "Over 0.5" pois muitas casas não oferecem este mercado.`
      : `MODO RISCO (maior retorno com risco controlado) – REGRAS OBRIGATÓRIAS:

⚠️ IMPORTANTE: Apenas sugerir mercados UNIVERSAIS que existem em 100% dos jogos.

✅ MERCADOS PERMITIDOS (garantidos em todos os jogos):
- Resultado Final (1X2) – Vitória da equipa FAVORITA
- Ambas Equipas Marcam (Sim ou Não)
- Mais de 2.5 golos no jogo
- Mais de 3.5 golos no jogo
- Resultado ao Intervalo (favorita a ganhar)

🚫 MERCADOS PROIBIDOS no Modo Risco:
- Mercados usados no Modo Seguro (Over 1.5, golo na 2ª parte, dupla hipótese)
- Mercados específicos de jogador
- Mercados de handicap asiático
- Primeira equipa a marcar

CRITÉRIOS FINAIS:
- Selecionar ODD MÉDIA do mercado (nunca a mais baixa, nunca a mais alta).
- PROIBIDO repetir qualquer mercado que seria usado no Modo Seguro.
- Priorizar "Vitória da Favorita" ou "Ambas Marcam" como sugestões principais.
- Faixa alvo de odds: 1.50–2.50 (priorizar odds médias).
- Se sugerires mercado por equipa, TEM de ser a EQUIPA FAVORITA.`;

  return `És um analista de apostas desportivas especializado. NÃO mostres cálculos internos.

⚠️ REGRA CRÍTICA: Sugere APENAS mercados que existem em TODOS os jogos de futebol.
Não inventes mercados. Usa apenas os mercados universais listados abaixo.

REGRAS GERAIS (ambos os modos):
- Sugerir APENAS mercados que existem em 100% das casas de apostas.
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
- Se sugerires mercado que NÃO está na lista de permitidos, INVALIDAR.

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
