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

    // Prompt otimizado e mais curto para respostas rápidas
    const modoDescricao = modo === "seguro"
      ? "MODO SEGURO: Escolha odds entre 1.10-1.50, máxima segurança, probabilidade mínima 75%."
      : "MODO RISCO: Escolha odds médias (nem muito baixas, nem muito altas), equilíbrio risco/recompensa.";

    const jogosTexto = jogos
      .map((j: any, i: number) => `${i + 1}. ${j.equipa_a} (${j.odd_a}) vs ${j.equipa_b} (${j.odd_b})`)
      .join("; ");

    const prompt = `Analista de apostas. ${modoDescricao}

Jogos: ${jogosTexto}

Para cada: mercado (1X2/Over-Under/BTTS/Handicap), odd final, análise curta (20 palavras max).
Depois: odd_total combinada, probabilidade %, análise geral (30 palavras max).

JSON exato:
{"jogos":[{"equipa_a":"A","equipa_b":"B","mercado_recomendado":"X","odd_final":1.5,"analise":"..."}],"odd_total":2.5,"probabilidade":70,"analise_geral":"..."}`;

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
