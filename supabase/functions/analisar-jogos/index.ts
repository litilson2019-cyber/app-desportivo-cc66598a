import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jogos, modo = "risco" } = await req.json();

    if (!jogos || jogos.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhum jogo fornecido" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY não configurada");
      return new Response(
        JSON.stringify({ error: "Configuração de IA ausente" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Prompt otimizado com lógica de SCORE DE CONFIANÇA multi-filtro
    const modoDescricao = modo === "seguro"
      ? `MODO SEGURO - PERFIL CONSERVADOR:
         - Analisa TODOS os mercados disponíveis (1X2, Over/Under, BTTS, Dupla Chance, Handicap, Draw No Bet, etc.)
         - APENAS considera mercados com probabilidade estimada >= 70%
         - Calcula SCORE DE CONFIANÇA baseado em: forma recente (últimos 5 jogos), confrontos diretos, consistência estatística, estabilidade da odd
         - Seleciona o mercado com MAIOR SCORE DE CONFIANÇA
         - Dentro dos mercados com score elevado, prioriza a ODD MAIS BAIXA (1.10-1.50)
         - Evita mercados de alto risco ou odds elevadas
         - Resultado: odds baixas, alta probabilidade, maior garantia estatística`
      : `MODO RISCO - PERFIL AGRESSIVO CONTROLADO:
         - Analisa TODOS os mercados disponíveis (1X2, Over/Under, BTTS, Dupla Chance, Handicap, Draw No Bet, etc.)
         - APENAS considera mercados com probabilidade estimada >= 70%
         - Calcula SCORE DE CONFIANÇA baseado em: forma recente (últimos 5 jogos), confrontos diretos, consistência estatística, estabilidade da odd
         - Seleciona mercados com SCORE ALTO mas prioriza ODDS MÉDIAS (1.50-2.50)
         - Maximiza potencial de retorno mantendo risco controlado
         - Resultado: odds médias, probabilidade aceitável (>=70%), maior retorno potencial`;

    const jogosTexto = jogos
      .map((j: any, i: number) => `${i + 1}. ${j.equipa_a} (odd: ${j.odd_a}) vs ${j.equipa_b} (odd: ${j.odd_b})`)
      .join("\n");

    const prompt = `És um analista de apostas desportivas ESPECIALIZADO com sistema de pontuação multi-filtro.

${modoDescricao}

JOGOS PARA ANALISAR:
${jogosTexto}

SISTEMA DE ANÁLISE MULTI-FILTRO (aplicar internamente, NÃO mostrar ao utilizador):
Para cada jogo, calcula um SCORE DE CONFIANÇA (0-100) baseado em:
1. FORMA RECENTE (25 pontos): Últimos 5 jogos de cada equipa
2. CONFRONTOS DIRETOS (25 pontos): Histórico head-to-head
3. CONSISTÊNCIA ESTATÍSTICA (25 pontos): Padrões de golos, clean sheets, etc.
4. ESTABILIDADE DA ODD (25 pontos): Odd estável = maior confiança

REGRAS CRÍTICAS:
- Analisa TODOS os mercados: 1X2, Dupla Chance, Over/Under (0.5 a 4.5), BTTS, Handicap, Draw No Bet, Intervalo/Final, Mercados de Golos
- EXCLUI mercados com probabilidade < 70%
- EXCLUI mercados com dados estatísticos insuficientes
- Seleciona UMA ÚNICA aposta por jogo baseada no MELHOR SCORE
- O utilizador vê APENAS a sugestão final, sem cálculos internos

ESTRUTURA DA RESPOSTA (OBRIGATÓRIA):
- aposta_final: A aposta escolhida (ex: "Under 1.5", "Vitória Porto", "Dupla Chance 1X")
- odd: Odd aproximada desta aposta específica
- probabilidade: Percentagem de sucesso estimada (número inteiro, mínimo 70)
- score_confianca: Score calculado (0-100)
- motivo: UMA frase curta justificando a escolha

RESPONDE APENAS com este JSON válido:
{
  "modo": "${modo === "seguro" ? "Sugestão – Modo Seguro" : "Sugestão – Modo Risco"}",
  "jogos": [
    {
      "equipa_a": "Nome",
      "equipa_b": "Nome",
      "aposta_final": "Under 1.5",
      "odd": 1.35,
      "probabilidade": 78,
      "score_confianca": 85,
      "motivo": "Frase curta baseada na análise"
    }
  ],
  "odd_total": 2.15,
  "probabilidade_total": 68,
  "resumo": "Frase curta sobre o bilhete"
}`;

    console.log("Enviando request para Lovable AI...");

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // Modelo mais rápido para respostas instantâneas
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.5,
          max_tokens: 800,
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Erro da API de IA:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Limite de requisições excedido. Tente novamente mais tarde.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({
            error: "Créditos insuficientes. Adicione créditos ao seu workspace.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({ error: "Erro ao processar análise da IA" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const aiData = await aiResponse.json();
    console.log("Resposta da IA recebida:", JSON.stringify(aiData));

    const content = aiData.choices[0]?.message?.content;
    if (!content) {
      console.error("Resposta da IA vazia");
      return new Response(
        JSON.stringify({ error: "Resposta da IA inválida" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let parsedContent;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedContent = JSON.parse(jsonMatch[0]);
      } else {
        parsedContent = JSON.parse(content);
      }
    } catch (parseError) {
      console.error("Erro ao fazer parse do JSON:", parseError);
      console.error("Conteúdo recebido:", content);
      return new Response(
        JSON.stringify({ error: "Formato de resposta inválido" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify(parsedContent), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro na função analisar-jogos:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
