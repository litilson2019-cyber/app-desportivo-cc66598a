import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Brain, Flame, AlertTriangle, TrendingUp, Sparkles, Shield,
  ChevronDown, Save, FileDown, Info, Loader2,
} from "lucide-react";
import { formatKz } from "@/lib/formatKz";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import jsPDF from "jspdf";

interface OddCasa {
  id?: string;
  casa_aposta: string;
  odd_casa: number | null;
  odd_empate: number | null;
  odd_fora: number | null;
  odd_over_25?: number | null;
  odd_under_25?: number | null;
  odd_btts_sim?: number | null;
  odd_btts_nao?: number | null;
}

interface Props {
  jogoId?: string;
  equipaCasa: string;
  equipaFora: string;
  competicao?: string | null;
  oddsCasas: OddCasa[];
}

type Mercado = "1x2" | "ou25" | "btts";

interface OutcomeBest {
  key: string;
  label: string;
  casa: string;
  odd: number;
}

const MERCADO_INFO: Record<Mercado, { nome: string; outcomes: { key: string; field: keyof OddCasa; label: (h: string, a: string) => string }[] }> = {
  "1x2": {
    nome: "Vencedor (1X2)",
    outcomes: [
      { key: "casa", field: "odd_casa", label: (h) => h },
      { key: "empate", field: "odd_empate", label: () => "Empate" },
      { key: "fora", field: "odd_fora", label: (_h, a) => a },
    ],
  },
  ou25: {
    nome: "Over/Under 2.5",
    outcomes: [
      { key: "over", field: "odd_over_25", label: () => "Mais de 2.5 golos" },
      { key: "under", field: "odd_under_25", label: () => "Menos de 2.5 golos" },
    ],
  },
  btts: {
    nome: "Ambas Marcam (BTTS)",
    outcomes: [
      { key: "sim", field: "odd_btts_sim", label: () => "Ambas Sim" },
      { key: "nao", field: "odd_btts_nao", label: () => "Ambas Não" },
    ],
  },
};

function isValidOdd(v: any): v is number {
  return typeof v === "number" && isFinite(v) && v > 1;
}

function computeBests(oddsCasas: OddCasa[], mercado: Mercado, h: string, a: string): { bests: OutcomeBest[]; missing: string[] } {
  const info = MERCADO_INFO[mercado];
  const bests: OutcomeBest[] = [];
  const missing: string[] = [];
  for (const out of info.outcomes) {
    let best: { casa: string; val: number } | null = null;
    let hasAny = false;
    for (const o of oddsCasas) {
      const v = o[out.field] as any;
      if (v != null) {
        hasAny = true;
        if (isValidOdd(v) && (!best || v > best.val)) best = { casa: o.casa_aposta, val: v };
      }
    }
    if (best) bests.push({ key: out.key, label: out.label(h, a), casa: best.casa, odd: best.val });
    else if (!hasAny) missing.push(out.label(h, a));
    else missing.push(`${out.label(h, a)} (odd inválida)`);
  }
  return { bests, missing };
}

function makeFingerprint(odds: OddCasa[]): string {
  return odds
    .map((o) =>
      [o.casa_aposta, o.odd_casa, o.odd_empate, o.odd_fora, o.odd_over_25, o.odd_under_25, o.odd_btts_sim, o.odd_btts_nao].join("|"),
    )
    .sort()
    .join(";");
}

export function SmartBetMode({ jogoId, equipaCasa, equipaFora, competicao, oddsCasas }: Props) {
  const [valor, setValor] = useState<string>("10000");
  const [mercado, setMercado] = useState<Mercado>("1x2");
  const [snapshot, setSnapshot] = useState<string>(() => makeFingerprint(oddsCasas));
  const [stale, setStale] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Detect odd changes during consultation
  useEffect(() => {
    const fp = makeFingerprint(oddsCasas);
    if (fp !== snapshot) setStale(true);
  }, [oddsCasas, snapshot]);

  const refreshSnapshot = () => {
    setSnapshot(makeFingerprint(oddsCasas));
    setStale(false);
    toast({ title: "Odds atualizadas" });
  };

  const mercadosDisponiveis: Mercado[] = useMemo(() => {
    const list: Mercado[] = [];
    (["1x2", "ou25", "btts"] as Mercado[]).forEach((m) => {
      const { bests } = computeBests(oddsCasas, m, equipaCasa, equipaFora);
      if (bests.length >= 2) list.push(m);
    });
    return list;
  }, [oddsCasas, equipaCasa, equipaFora]);

  useEffect(() => {
    if (mercadosDisponiveis.length && !mercadosDisponiveis.includes(mercado)) {
      setMercado(mercadosDisponiveis[0]);
    }
  }, [mercadosDisponiveis, mercado]);

  const { bests, missing } = useMemo(
    () => computeBests(oddsCasas, mercado, equipaCasa, equipaFora),
    [oddsCasas, mercado, equipaCasa, equipaFora],
  );

  const totalOutcomes = MERCADO_INFO[mercado].outcomes.length;
  const incompleto = bests.length < totalOutcomes;
  const podeCalcular = bests.length >= 2 && !incompleto && !stale;

  const plano = useMemo(() => {
    const total = parseFloat(valor);
    if (!podeCalcular || !total || total <= 0) return null;

    const invSum = bests.reduce((s, b) => s + 1 / b.odd, 0);
    const margem = (invSum - 1) * 100;
    const distrib = bests.map((b) => {
      const stake = (total * (1 / b.odd)) / invSum;
      const retorno = stake * b.odd;
      const lucro = retorno - total;
      return { ...b, stake, retorno, lucro };
    });

    const minLucro = Math.min(...distrib.map((d) => d.lucro));
    const minLucroPct = (minLucro / total) * 100;

    let risco: "baixo" | "medio" | "alto";
    if (margem < 0 && minLucro >= 0) risco = "baixo";
    else if (margem < 5 || minLucroPct >= -10) risco = "medio";
    else risco = "alto";

    const melhor = distrib.reduce((a, b) => (b.odd > a.odd ? b : a));
    return { distrib, margem, risco, minLucro, minLucroPct, melhor, total };
  }, [valor, bests, podeCalcular]);

  const handleSalvar = async () => {
    if (!plano) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); toast({ title: "Faça login", variant: "destructive" }); return; }

    const jogos = plano.distrib.map((d) => ({
      jogo: `${equipaCasa} vs ${equipaFora}`,
      mercado: MERCADO_INFO[mercado].nome,
      resultado: d.label,
      casa_aposta: d.casa,
      odd: d.odd,
      stake: Math.round(d.stake),
      retorno_estimado: Math.round(d.retorno),
      lucro_estimado: Math.round(d.lucro),
    }));

    const { error } = await supabase.from("bilhetes").insert({
      user_id: user.id,
      jogos,
      odds_totais: plano.distrib.reduce((s, d) => s + d.odd, 0),
      modo: "modo_inteligente",
      probabilidade_estimada: Math.max(0, 100 - plano.margem),
      analise_ia: `Modo Inteligente (${MERCADO_INFO[mercado].nome}) — Investimento ${formatKz(plano.total)}, margem ${plano.margem.toFixed(2)}%, risco ${plano.risco}.`,
      mercados_recomendados: { mercado: MERCADO_INFO[mercado].nome, distribuicao: jogos, risco: plano.risco, margem: plano.margem },
      status: "pendente",
    });
    setSaving(false);
    if (error) toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    else toast({ title: "Plano salvo no histórico ✓" });
  };

  const handleExportPDF = async () => {
    if (!plano) return;
    setExporting(true);
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const margin = 40;
      let y = margin;

      doc.setFontSize(18); doc.setFont("helvetica", "bold");
      doc.text("Modo Inteligente de Apostas", margin, y); y += 24;

      doc.setFontSize(11); doc.setFont("helvetica", "normal");
      doc.text(`${equipaCasa} vs ${equipaFora}`, margin, y); y += 16;
      if (competicao) { doc.text(`Competicao: ${competicao}`, margin, y); y += 14; }
      doc.text(`Mercado: ${MERCADO_INFO[mercado].nome}`, margin, y); y += 14;
      doc.text(`Investimento total: ${formatKz(plano.total)}`, margin, y); y += 14;
      doc.text(`Margem: ${plano.margem.toFixed(2)}%   Risco: ${plano.risco.toUpperCase()}   Pior cenario: ${plano.minLucro >= 0 ? "+" : ""}${formatKz(Math.round(plano.minLucro))}`, margin, y); y += 24;

      doc.setFont("helvetica", "bold"); doc.text("Distribuicao por casa", margin, y); y += 16;
      doc.setFont("helvetica", "normal"); doc.setFontSize(10);
      plano.distrib.forEach((d) => {
        const lines = [
          `- ${d.label} @ ${d.odd.toFixed(2)} (${d.casa})`,
          `   Apostar: ${formatKz(Math.round(d.stake))}   Retorno: ${formatKz(Math.round(d.retorno))}   Lucro: ${d.lucro >= 0 ? "+" : ""}${formatKz(Math.round(d.lucro))}`,
        ];
        lines.forEach((l) => { doc.text(l, margin, y); y += 14; });
        y += 4;
      });

      y += 10;
      doc.setFontSize(9); doc.setTextColor(120);
      doc.text("Aviso: apenas otimizacao matematica. Nao ha garantia de lucro. As odds podem mudar nas casas reais. Aposte com responsabilidade.", margin, y, { maxWidth: 515 });

      doc.save(`modo-inteligente-${equipaCasa.replace(/\s+/g, "_")}-vs-${equipaFora.replace(/\s+/g, "_")}.pdf`);
      toast({ title: "PDF exportado ✓" });
    } catch (e: any) {
      toast({ title: "Erro ao exportar", description: e.message, variant: "destructive" });
    }
    setExporting(false);
  };

  if (mercadosDisponiveis.length === 0) {
    return (
      <Card className="p-4 rounded-2xl shadow-soft">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-4 h-4 text-primary" />
          <p className="font-bold text-sm">Modo Inteligente de Apostas</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Nenhum mercado tem odds completas em pelo menos 2 casas. Adicione mais odds no admin para ativar o modo inteligente.
        </p>
      </Card>
    );
  }

  const riscoExplicacao = plano ? getRiscoExplicacao(plano.risco, plano.margem, plano.minLucroPct) : null;

  return (
    <Card className="p-4 rounded-2xl shadow-soft bg-gradient-to-br from-primary/5 via-transparent to-emerald-500/5 border-primary/20">
      <div className="flex items-center gap-2 mb-1">
        <div className="p-1.5 rounded-lg bg-primary/10">
          <Brain className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-sm">Modo Inteligente</p>
          <p className="text-[10px] text-muted-foreground">Distribuição otimizada entre casas</p>
        </div>
        <Badge variant="outline" className="ml-auto text-[9px] gap-1">
          <Sparkles className="w-3 h-3" /> Beta
        </Badge>
      </div>

      {/* Mercado selector */}
      {mercadosDisponiveis.length > 1 && (
        <div className="mt-3 space-y-1.5">
          <Label className="text-xs">Mercado</Label>
          <Select value={mercado} onValueChange={(v) => setMercado(v as Mercado)}>
            <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              {mercadosDisponiveis.map((m) => (
                <SelectItem key={m} value={m}>{MERCADO_INFO[m].nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Stale warning */}
      {stale && (
        <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">As odds mudaram durante a consulta</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">O cálculo está bloqueado para evitar uma estratégia desatualizada.</p>
            <Button size="sm" variant="outline" className="mt-2 h-7 text-[11px] rounded-lg" onClick={refreshSnapshot}>
              Recalcular com odds atuais
            </Button>
          </div>
        </div>
      )}

      {/* Missing odds warning */}
      {incompleto && !stale && (
        <div className="mt-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">Odds insuficientes ou inválidas</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Faltam: {missing.join(", ")}. O cálculo precisa de todos os resultados deste mercado.
            </p>
          </div>
        </div>
      )}

      <div className="mt-3 space-y-1.5">
        <Label htmlFor="smart-valor" className="text-xs">Valor total a investir (Kz)</Label>
        <Input
          id="smart-valor"
          type="number"
          inputMode="numeric"
          min={0}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="Ex: 10000"
          className="h-10 rounded-xl"
          disabled={!podeCalcular}
        />
        <div className="flex gap-1.5 flex-wrap pt-1">
          {[5000, 10000, 25000, 50000].map((v) => (
            <Button
              key={v}
              size="sm"
              variant="outline"
              className="h-7 text-[11px] rounded-lg flex-1"
              onClick={() => setValor(String(v))}
              disabled={!podeCalcular}
            >
              {formatKz(v)}
            </Button>
          ))}
        </div>
      </div>

      {plano && (
        <>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Stat
              label="Margem"
              value={`${plano.margem >= 0 ? "+" : ""}${plano.margem.toFixed(1)}%`}
              color={plano.margem < 0 ? "text-emerald-600 dark:text-emerald-400" : plano.margem < 5 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"}
            />
            <Stat
              label="Risco"
              value={plano.risco.toUpperCase()}
              color={plano.risco === "baixo" ? "text-emerald-600 dark:text-emerald-400" : plano.risco === "medio" ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"}
              icon={<Shield className="w-3 h-3" />}
            />
            <Stat
              label="Pior cenário"
              value={`${plano.minLucro >= 0 ? "+" : ""}${formatKz(Math.round(plano.minLucro))}`}
              color={plano.minLucro >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}
            />
          </div>

          {/* Risco explicação expansível */}
          {riscoExplicacao && (
            <Collapsible className="mt-3">
              <CollapsibleTrigger className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/40 border border-border/60 hover:bg-muted/60 transition-colors">
                <Info className="w-3.5 h-3.5 text-primary" />
                <span className="text-[11px] font-medium flex-1 text-left">Entender o nível de risco</span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-3 py-3 mt-1 rounded-xl bg-background/60 border border-border/40 space-y-2">
                <p className="text-[11px] leading-relaxed">{riscoExplicacao.descricao}</p>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">Como reduzir a exposição</p>
                  <ul className="space-y-1">
                    {riscoExplicacao.dicas.map((d, i) => (
                      <li key={i} className="text-[11px] flex gap-1.5">
                        <span className="text-primary">•</span><span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          <div className="mt-4 space-y-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium px-1">
              Plano de distribuição
            </p>
            {plano.distrib.map((d) => {
              const isMelhor = d.casa === plano.melhor.casa && d.key === plano.melhor.key;
              return (
                <div
                  key={d.key}
                  className={`p-3 rounded-xl border ${isMelhor ? "border-amber-500/40 bg-amber-500/5" : "border-border/60 bg-muted/20"}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isMelhor && <Flame className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                      <span className="font-semibold text-sm truncate">{d.label}</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0">@ {d.odd.toFixed(2)}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-2">
                    <span>na casa <strong className="text-foreground">{d.casa}</strong></span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <MiniStat label="Apostar" value={formatKz(Math.round(d.stake))} />
                    <MiniStat label="Retorno" value={formatKz(Math.round(d.retorno))} highlight />
                    <MiniStat
                      label="Lucro"
                      value={`${d.lucro >= 0 ? "+" : ""}${formatKz(Math.round(d.lucro))}`}
                      color={d.lucro >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {plano.margem < 0 && (
            <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                Combinação favorável detectada: cobrindo todos os cenários, o retorno tende a superar o investimento.
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-10 rounded-xl gap-1.5"
              onClick={handleSalvar}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar no histórico
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-10 rounded-xl gap-1.5"
              onClick={handleExportPDF}
              disabled={exporting}
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              Exportar PDF
            </Button>
          </div>

          <div className="mt-3 p-2.5 rounded-xl bg-muted/40 border border-border/60 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Apenas otimização matemática baseada nas odds cadastradas. <strong>Não há garantia de lucro.</strong> Odds podem mudar nas casas reais. Aposte com responsabilidade.
            </p>
          </div>
        </>
      )}
    </Card>
  );
}

function getRiscoExplicacao(risco: "baixo" | "medio" | "alto", margem: number, piorPct: number) {
  const base = `Margem da casa: ${margem.toFixed(2)}%. Pior cenário equivale a ${piorPct.toFixed(1)}% do investimento.`;
  if (risco === "baixo") {
    return {
      descricao: `Risco BAIXO. ${base} A combinação cobre todos os cenários com retorno previsível.`,
      dicas: [
        "Mantenha o valor proporcional ao seu orçamento mensal de apostas.",
        "Confirme as odds nas casas antes de apostar (podem mudar).",
        "Evite aumentar o stake após uma vitória — preserve o ganho.",
      ],
    };
  }
  if (risco === "medio") {
    return {
      descricao: `Risco MÉDIO. ${base} A margem ainda é controlada, mas existe possibilidade de perda parcial.`,
      dicas: [
        "Reduza o valor total para limitar a perda no pior cenário.",
        "Considere apostar apenas no resultado de melhor odd, em vez de cobrir todos.",
        "Procure odds melhores em outras casas para baixar a margem.",
        "Defina um limite diário de perda e respeite-o.",
      ],
    };
  }
  return {
    descricao: `Risco ALTO. ${base} A margem agregada é elevada — cobrir todos os cenários tende a gerar perda.`,
    dicas: [
      "Não cubra todos os cenários: escolha apenas 1 resultado com convicção.",
      "Reduza significativamente o stake (idealmente <2% do seu saldo).",
      "Aguarde melhores odds ou outro jogo com margem menor.",
      "Considere não apostar — a vantagem matemática não está do seu lado.",
    ],
  };
}

function Stat({ label, value, color = "text-foreground", icon }: { label: string; value: string; color?: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-background/60 rounded-xl p-2 text-center border border-border/40">
      <p className="text-[9px] uppercase text-muted-foreground font-medium flex items-center justify-center gap-1">{icon}{label}</p>
      <p className={`text-sm font-bold ${color}`}>{value}</p>
    </div>
  );
}

function MiniStat({ label, value, color, highlight }: { label: string; value: string; color?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-1.5 ${highlight ? "bg-primary/10" : "bg-background/60"}`}>
      <p className="text-[9px] uppercase text-muted-foreground">{label}</p>
      <p className={`text-[11px] font-bold ${color || "text-foreground"}`}>{value}</p>
    </div>
  );
}
