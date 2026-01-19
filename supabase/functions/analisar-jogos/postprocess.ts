import type { JogoInput, Modo } from "./prompt.ts";

export type ResultadoJogo = {
  equipa_a: string;
  equipa_b: string;
  aposta_final: string;
  odd: number;
  probabilidade: number;
  score_confianca: number;
  motivo: string;
};

export type ResultadoAnalise = {
  modo: string;
  jogos: ResultadoJogo[];
  odd_total: number;
  probabilidade_total: number;
  resumo: string;
  warning?: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function getFavorita(j: JogoInput) {
  const favorita = j.odd_a <= j.odd_b ? j.equipa_a : j.equipa_b;
  const naoFavorita = j.odd_a <= j.odd_b ? j.equipa_b : j.equipa_a;
  const oddFavorita = Math.min(j.odd_a, j.odd_b);
  return { favorita, naoFavorita, oddFavorita };
}

function isLikelyTotalMarket(aposta: string) {
  const a = (aposta || "").toLowerCase();
  return (
    a.includes("total") ||
    a.includes("over") ||
    a.includes("under") ||
    a.includes("golos") ||
    a.includes("gols")
  );
}

export function buildFallbackResultado(jogos: JogoInput[], modo: Modo): ResultadoAnalise {
  const modoTexto =
    modo === "seguro"
      ? "Sugestão – Modo Seguro (Odd mais baixa)"
      : "Sugestão – Modo Risco (Odd média)";

  const jogosOut: ResultadoJogo[] = jogos.map((j) => {
    const { favorita, oddFavorita } = getFavorita(j);
    const prob = clamp(Math.round(100 / oddFavorita), 70, 95);
    return {
      equipa_a: j.equipa_a,
      equipa_b: j.equipa_b,
      aposta_final: `Vitória ${favorita} (1X2)`,
      odd: round2(oddFavorita),
      probabilidade: prob,
      score_confianca: clamp(prob, 70, 95),
      motivo: "Sugestão gerada em modo de contingência (falha de formatação da IA).",
    };
  });

  const oddTotal = round2(jogosOut.reduce((acc, j) => acc * (Number(j.odd) || 1), 1));
  const probTotal = clamp(
    Math.round(
      jogosOut.reduce((acc, j) => acc * clamp((Number(j.probabilidade) || 70) / 100, 0.7, 0.99), 1) * 100
    ),
    1,
    99
  );

  return {
    modo: modoTexto,
    jogos: jogosOut,
    odd_total: oddTotal,
    probabilidade_total: probTotal,
    resumo: "Bilhete gerado com fallback automático; tente novamente para uma análise completa.",
    warning: "fallback",
  };
}

export function postProcessResultado(
  raw: any,
  jogosInput: JogoInput[],
  modo: Modo
): ResultadoAnalise {
  const modoTexto =
    modo === "seguro"
      ? "Sugestão – Modo Seguro (Odd mais baixa)"
      : "Sugestão – Modo Risco (Odd média)";

  if (!raw || typeof raw !== "object") return buildFallbackResultado(jogosInput, modo);

  const jogosRaw = Array.isArray(raw.jogos) ? raw.jogos : [];
  const jogosOut: ResultadoJogo[] = jogosInput.map((j, idx) => {
    const r = jogosRaw[idx] ?? {};
    const { favorita, naoFavorita, oddFavorita } = getFavorita(j);

    let aposta = String(r.aposta_final ?? "").trim();
    let odd = Number(r.odd);
    let prob = Number(r.probabilidade);
    let score = Number(r.score_confianca);
    let motivo = String(r.motivo ?? "").trim();

    // Normalizações
    if (!Number.isFinite(odd) || odd <= 1) odd = oddFavorita;
    if (!Number.isFinite(prob)) prob = clamp(Math.round(100 / odd), 70, 95);
    prob = clamp(Math.round(prob), 1, 99);
    if (!Number.isFinite(score)) score = clamp(prob, 70, 95);
    score = clamp(Math.round(score), 1, 99);
    if (!motivo) motivo = "Sugestão baseada em filtros de probabilidade e estabilidade.";

    // Correção: nunca sugerir a favor da NÃO favorita (principalmente no Seguro)
    const apostaLower = aposta.toLowerCase();
    const naoFavLower = naoFavorita.toLowerCase();
    const favLower = favorita.toLowerCase();

    const mencionaNaoFav = naoFavLower && apostaLower.includes(naoFavLower);
    const mencionaFav = favLower && apostaLower.includes(favLower);

    if (mencionaNaoFav && !mencionaFav && !isLikelyTotalMarket(aposta)) {
      aposta = `Vitória ${favorita} (1X2)`;
      odd = oddFavorita;
      prob = clamp(Math.round(100 / oddFavorita), 70, 95);
      score = clamp(prob, 70, 95);
      motivo = "Correção automática: evitada sugestão ligada à equipa não favorita.";
    }

    // Clarificar Over/Under como TOTAL DO JOGO
    if (/\bover\b/i.test(aposta) && !/total/i.test(aposta)) {
      aposta = `Total do jogo - ${aposta}`;
    }

    return {
      equipa_a: j.equipa_a,
      equipa_b: j.equipa_b,
      aposta_final: aposta || `Vitória ${favorita} (1X2)`,
      odd: round2(odd),
      probabilidade: prob,
      score_confianca: score,
      motivo,
    };
  });

  const oddTotal = round2(jogosOut.reduce((acc, j) => acc * (Number(j.odd) || 1), 1));
  const probTotal = clamp(
    Math.round(
      jogosOut.reduce((acc, j) => acc * clamp((Number(j.probabilidade) || 70) / 100, 0.7, 0.99), 1) * 100
    ),
    1,
    99
  );

  return {
    modo: modoTexto,
    jogos: jogosOut,
    odd_total: Number.isFinite(Number(raw.odd_total)) ? round2(Number(raw.odd_total)) : oddTotal,
    probabilidade_total: Number.isFinite(Number(raw.probabilidade_total))
      ? clamp(Math.round(Number(raw.probabilidade_total)), 1, 99)
      : probTotal,
    resumo: String(raw.resumo ?? "").trim() || "Bilhete gerado com base nos filtros do modo selecionado.",
  };
}
