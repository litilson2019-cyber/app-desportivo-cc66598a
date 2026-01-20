import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildPrompt, normalizeJogos, normalizeModo } from "./prompt.ts";
import { normalizeMarket } from "./markets.ts";
import { buildRepairPrompt, parseFirstJsonObject } from "./json.ts";
import { buildFallbackResultado, postProcessResultado } from "./postprocess.ts";

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
    const body = await req.json();
    const modo = normalizeModo(body?.modo);
    const jogos = normalizeJogos(body?.jogos);
    const market = normalizeMarket(body?.market);

    if (!jogos || jogos.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhum jogo fornecido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY não configurada");
      return new Response(JSON.stringify({ error: "Configuração de IA ausente" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = buildPrompt(jogos, modo, market);
    console.log("Enviando request para Lovable AI com mercado:", market);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 1200,
      }),
    });

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

      return new Response(JSON.stringify({ error: "Erro ao processar análise da IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData?.choices?.[0]?.message?.content ?? "";

    let parsed = parseFirstJsonObject(content);

    // Tenta reparar caso o modelo devolva texto misto / JSON inválido
    if (!parsed) {
      console.error("Resposta não veio em JSON. Conteúdo recebido:", content);

      const expectedModo =
        modo === "seguro"
          ? "Sugestão – Modo Seguro (Odd mais baixa)"
          : "Sugestão – Modo Risco (Odd média)";

      const repairPrompt = buildRepairPrompt(content, expectedModo);
      const repairResponse = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [{ role: "user", content: repairPrompt }],
            temperature: 0,
            max_tokens: 700,
          }),
        }
      );

      if (repairResponse.ok) {
        const repairData = await repairResponse.json();
        const repairContent = repairData?.choices?.[0]?.message?.content ?? "";
        parsed = parseFirstJsonObject(repairContent);
      }
    }

    // Se ainda falhar, devolve fallback 200 (evita erro no UI e evita perder saldo)
    const payload = parsed
      ? postProcessResultado(parsed, jogos, modo)
      : buildFallbackResultado(jogos, modo);

    return new Response(JSON.stringify(payload), {
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
