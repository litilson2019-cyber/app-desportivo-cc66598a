export function extractFirstJsonObject(text: string): string | null {
  if (!text) return null;

  // Prefer fenced ```json blocks
  const fenced = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    const candidate = fenced[1].trim();
    if (candidate.startsWith("{") && candidate.endsWith("}")) return candidate;
  }

  // Brace matching for first JSON object
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const c = text[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (c === "\\") {
      if (inString) escape = true;
      continue;
    }

    if (c === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (c === "{") depth++;
    if (c === "}") depth--;

    if (depth === 0) {
      return text.slice(start, i + 1).trim();
    }
  }

  return null;
}

export function parseFirstJsonObject(text: string): any | null {
  const jsonStr = extractFirstJsonObject(text);
  if (!jsonStr) return null;
  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

export function buildRepairPrompt(rawText: string, expectedModo: string) {
  return `Transforma o conteúdo abaixo em APENAS JSON válido (sem markdown, sem texto extra).

- O campo "modo" deve ser exatamente: ${expectedModo}
- Mantém apenas a estrutura e campos necessários.

ESTRUTURA OBRIGATÓRIA:
{
  "modo": "...",
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
}

CONTEÚDO:
"""
${rawText}
"""`;
}
