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

    const modoInstrucoes = modo === "seguro"
      ? `
MODO SEGURO ATIVADO - ODDS MAIS BAIXAS DISPONÍVEIS:

Para cada jogo, faça o seguinte:

1. ANALISE TODOS OS MERCADOS DISPONÍVEIS:
   - 1X2 (Casa, Empate, Fora)
   - Chance Dupla (1X, X2, 12)
   - Mais/Menos Golos (Over/Under 0.5, 1.5, 2.5, 3.5, etc.)
   - Ambas Marcam (BTTS Sim/Não)
   - Handicap Asiático e Europeu
   - Empate Anula Aposta
   - Resultado Intervalo/Final
   - Mercado de Golos da Equipa (Casa/Fora Over/Under)
   - Qualquer outro mercado disponível

2. IDENTIFIQUE A ODD MAIS BAIXA:
   - Entre TODOS os mercados listados acima
   - Selecione sempre a odd MAIS BAIXA encontrada
   - Exemplo: se favorito tem odd 1.50, mas Chance Dupla tem 1.19, ou X2 tem 1.16, selecione a 1.16

3. CRITÉRIOS DE SELEÇÃO:
   - Prioridade absoluta: SEGURANÇA MÁXIMA
   - Risco mínimo é mais importante que lucro
   - Selecione apenas odds entre 1.10 e 1.50
   - Probabilidade mínima de acerto: 75%

4. ANÁLISE ESTATÍSTICA (para validar a escolha):
   - Forma dos últimos 5 jogos
   - Força ofensiva e defensiva
   - Histórico de confrontos diretos
   - Posição na tabela
   - Estatísticas de golos marcados e sofridos
   - Se é time favorito jogando em casa
   - Estatísticas do mercado escolhido

5. RESULTADO FINAL:
   - Para cada jogo, retornar SOMENTE o mercado com a ODD MAIS BAIXA
   - NÃO mostrar odds médias ou altas
   - Foco em CONSISTÊNCIA, não em lucro alto
   - Ganho reduzido mas SEGURO`
      : `
MODO RISCO - ODD MÉDIA (RISCO MODERADO):

Para cada jogo, faça o seguinte:

1. ANALISE TODOS OS MERCADOS DISPONÍVEIS:
   - 1X2 (Casa, Empate, Fora)
   - Chance Dupla (1X, X2, 12)
   - Mais/Menos Golos (Over/Under 0.5, 1.5, 2.5, 3.5, etc.)
   - Ambas Marcam (BTTS Sim/Não)
   - Handicap Asiático e Europeu
   - Empate Anula Aposta
   - Resultado Intervalo/Final
   - Mercado de Golos da Equipa (Casa/Fora Over/Under)
   - Qualquer outro mercado disponível

2. IDENTIFIQUE E ORDENE TODAS AS ODDS:
   - Liste todas as odds encontradas em todos os mercados
   - Ordene-as de forma crescente (da menor para a maior)
   - Identifique qual é a odd que está no MEIO da lista

3. SELECIONE A ODD MÉDIA:
   - NÃO selecione a odd mais baixa (isso é modo seguro)
   - NÃO selecione a odd mais alta (muito arriscada)
   - Selecione SEMPRE a odd que está no MEIO da ordenação
   - Esta representa risco moderado com bom equilíbrio

4. EXEMPLO PRÁTICO:
   Odds encontradas: 1.60, 1.32, 1.25
   Ordenação: 1.25 (menor), 1.32 (média), 1.60 (maior)
   Selecionar: 1.32 (a odd média)

5. ANÁLISE ESTATÍSTICA (para validar a escolha):
   - Forma dos últimos 5 jogos
   - Força ofensiva e defensiva
   - Histórico de confrontos diretos
   - Posição na tabela
   - Estatísticas de golos marcados e sofridos
   - Se é time favorito jogando em casa
   - Estatísticas do mercado escolhido

6. OBJETIVO DO MODO RISCO:
   - Buscar risco moderado
   - Odds equilibradas
   - Melhor relação risco/recompensa
   - Evitar extremos (nem muito baixo, nem muito alto)

7. RESULTADO FINAL:
   - Retornar o mercado que contém a odd MÉDIA
   - Nunca retornar a mais baixa
   - Nunca retornar a mais alta
   - Foco em EQUILÍBRIO entre segurança e lucro`;

    const prompt = `Você é um analista especializado em apostas desportivas. ${modoInstrucoes}

Analise os seguintes jogos:

${jogos
  .map(
    (j: any, i: number) =>
      `Jogo ${i + 1}: ${j.equipa_a} (odd: ${j.odd_a}) vs ${j.equipa_b} (odd: ${j.odd_b})`
  )
  .join("\n")}

Para cada jogo, determine:
1. O melhor mercado (1X2, Over/Under, BTTS, Handicap, etc.)
2. A odd final recomendada ${modo === "seguro" ? "(DEVE estar entre 1.10 e 1.50)" : ""}
3. Uma breve análise (máx 50 palavras)

Depois, calcule:
- Odd total combinada
- Probabilidade estimada de sucesso (%) ${modo === "seguro" ? "(mínimo 75%)" : ""}
- Análise geral do bilhete (máx 100 palavras)

Responda APENAS com um JSON válido neste formato exato:
{
  "jogos": [
    {
      "equipa_a": "Nome A",
      "equipa_b": "Nome B",
      "mercado_recomendado": "Mercado",
      "odd_final": 1.85,
      "analise": "Texto breve"
    }
  ],
  "odd_total": 5.23,
  "probabilidade": 65,
  "analise_geral": "Texto da análise geral"
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
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                "Você é um analista de apostas desportivas. Responda sempre em JSON válido.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
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
