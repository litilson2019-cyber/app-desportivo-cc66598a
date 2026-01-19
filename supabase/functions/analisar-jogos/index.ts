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

    // Prompt otimizado com DIFERENCIAÇÃO OBRIGATÓRIA entre modos
    const modoDescricao = modo === "seguro"
      ? `MODO SEGURO - PERFIL ULTRA CONSERVADOR:
         REGRA OBRIGATÓRIA: Selecionar SEMPRE a ODD MAIS BAIXA disponível.
         
         PROCESSO DE SELEÇÃO:
         1. Analisar TODOS os mercados disponíveis (1X2, Over/Under, BTTS, Dupla Chance, Handicap, etc.)
         2. Filtrar APENAS mercados com probabilidade ≥ 70%
         3. ORDENAR por odd em ordem CRESCENTE
         4. SELECIONAR OBRIGATORIAMENTE a odd mais baixa (ex: 1.05, 1.10, 1.15)
         5. O score de confiança é filtro mínimo, NÃO critério principal
         
         PROIBIDO:
         - Sugerir odd superior se existir odd mais baixa válida
         - Sugerir odds acima de 1.50
         
         FAIXA DE ODDS OBRIGATÓRIA: 1.01 - 1.50 (priorizar as mais baixas)`
      : `MODO RISCO - PERFIL AGRESSIVO CONTROLADO:
         REGRA OBRIGATÓRIA: Selecionar ODD MÉDIA (nunca a mais baixa, nunca a mais alta).
         
         PROCESSO DE SELEÇÃO:
         1. Analisar TODOS os mercados disponíveis
         2. Filtrar APENAS mercados com probabilidade ≥ 70%
         3. ORDENAR por odd em ordem crescente
         4. EXCLUIR a odd mais baixa (essa é para Modo Seguro)
         5. EXCLUIR odds extremamente altas (acima de 3.00)
         6. SELECIONAR uma odd MÉDIA do conjunto restante
         
         PROIBIDO:
         - Repetir a mesma sugestão do Modo Seguro
         - Selecionar a odd mais baixa disponível
         
         FAIXA DE ODDS OBRIGATÓRIA: 1.40 - 2.50 (priorizar odds médias)`;

    const jogosTexto = jogos
      .map((j: any, i: number) => `${i + 1}. ${j.equipa_a} (odd: ${j.odd_a}) vs ${j.equipa_b} (odd: ${j.odd_b})`)
      .join("\n");

    const prompt = `És um analista de apostas desportivas ESPECIALIZADO com sistema de seleção DIFERENCIADA por modo.

${modoDescricao}

JOGOS PARA ANALISAR:
${jogosTexto}

SISTEMA DE ANÁLISE (aplicar internamente):
1. Para cada jogo, identifica TODOS os mercados possíveis
2. Calcula probabilidade estimada de cada mercado
3. Filtra mercados com probabilidade ≥ 70%
4. Ordena por odd (crescente)
5. Aplica regra do MODO selecionado para escolha final

DIFERENCIAÇÃO OBRIGATÓRIA:
- MODO SEGURO → Sempre a ODD MAIS BAIXA (ex: 1.10, 1.15, 1.20)
- MODO RISCO → Sempre ODD MÉDIA, DIFERENTE do Modo Seguro (ex: 1.45, 1.60, 1.80)

EXEMPLO PRÁTICO:
Se odds disponíveis são: 1.10 (Under 0.5), 1.25 (Dupla Chance), 1.55 (Under 2.5), 1.90 (Vitória)
- Modo Seguro → Under 0.5 @ 1.10
- Modo Risco → Under 2.5 @ 1.55

ESTRUTURA DA RESPOSTA (OBRIGATÓRIA):
{
  "modo": "${modo === "seguro" ? "Sugestão – Modo Seguro (Odd mais baixa)" : "Sugestão – Modo Risco (Odd média)"}",
  "jogos": [
    {
      "equipa_a": "Nome",
      "equipa_b": "Nome",
      "aposta_final": "Mercado selecionado",
      "odd": 1.XX,
      "probabilidade": 75,
      "score_confianca": 80,
      "motivo": "Justificação curta"
    }
  ],
  "odd_total": X.XX,
  "probabilidade_total": XX,
  "resumo": "Frase sobre o bilhete"
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
