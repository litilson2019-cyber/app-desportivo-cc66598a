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

    // Prompt otimizado para apostas diretas e práticas
    const modoDescricao = modo === "seguro"
      ? "MODO SEGURO: Apenas apostas com probabilidade ACIMA de 70%. Odds entre 1.10-1.60. Priorize segurança máxima."
      : "MODO RISCO: Inclui apostas com probabilidade menor que 70%. Pode sugerir odds mais altas para maior retorno.";

    const jogosTexto = jogos
      .map((j: any, i: number) => `${i + 1}. ${j.equipa_a} (odd: ${j.odd_a}) vs ${j.equipa_b} (odd: ${j.odd_b})`)
      .join("\n");

    const prompt = `És um analista de apostas desportivas. ${modoDescricao}

JOGOS PARA ANALISAR:
${jogosTexto}

REGRAS OBRIGATÓRIAS:
1. Para CADA jogo, indica diretamente:
   - resultado_1x2: "Vitória [Equipa]" ou "Empate"
   - mercado_gols: Over/Under específico (ex: "Over 2.5", "Under 1.5")
   - aposta_extra: Se relevante (ex: "Ambas Marcam Sim", "Dupla Chance 1X")
   - odd_final: Odd aproximada da melhor aposta
   - probabilidade: Percentagem de sucesso estimada
   - motivo: UMA frase curta explicando a escolha

2. Sê DIRETO e PRÁTICO. Sem textos longos ou análises genéricas.
3. Foco em aposta clara e confiável.

RESPONDE APENAS com este JSON exato:
{
  "jogos": [
    {
      "equipa_a": "Nome",
      "equipa_b": "Nome",
      "resultado_1x2": "Vitória [Equipa]",
      "mercado_gols": "Over 2.5",
      "aposta_extra": "Ambas Marcam Sim",
      "odd_final": 1.85,
      "probabilidade": 72,
      "motivo": "Frase curta explicativa"
    }
  ],
  "odd_total": 3.45,
  "probabilidade": 65,
  "analise_geral": "Resumo de 1 frase sobre o bilhete"
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
