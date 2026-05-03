import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Brain, Flame, AlertTriangle, TrendingUp, Sparkles, Shield } from "lucide-react";
import { formatKz } from "@/lib/formatKz";

interface OddCasa {
  casa_aposta: string;
  odd_casa: number | null;
  odd_empate: number | null;
  odd_fora: number | null;
}

interface Props {
  equipaCasa: string;
  equipaFora: string;
  oddsCasas: OddCasa[];
}

type Key = "casa" | "empate" | "fora";

interface Best {
  key: Key;
  label: string;
  casa: string;
  odd: number;
}

export function SmartBetMode({ equipaCasa, equipaFora, oddsCasas }: Props) {
  const [valor, setValor] = useState<string>("10000");

  const bests = useMemo<Best[]>(() => {
    const labels: Record<Key, string> = {
      casa: equipaCasa,
      empate: "Empate",
      fora: equipaFora,
    };
    const result: Best[] = [];
    (["casa", "empate", "fora"] as Key[]).forEach((k) => {
      const field = k === "casa" ? "odd_casa" : k === "empate" ? "odd_empate" : "odd_fora";
      let best: { casa: string; val: number } | null = null;
      for (const o of oddsCasas) {
        const v = o[field as keyof OddCasa] as number | null;
        if (v != null && v > 0 && (!best || v > best.val)) {
          best = { casa: o.casa_aposta, val: v };
        }
      }
      if (best) result.push({ key: k, label: labels[k], casa: best.casa, odd: best.val });
    });
    return result;
  }, [equipaCasa, equipaFora, oddsCasas]);

  const plano = useMemo(() => {
    const total = parseFloat(valor);
    if (!total || total <= 0 || bests.length === 0) return null;

    const invSum = bests.reduce((s, b) => s + 1 / b.odd, 0);
    const margem = (invSum - 1) * 100; // <0 = arbitragem
    const distrib = bests.map((b) => {
      const stake = (total * (1 / b.odd)) / invSum;
      const retorno = stake * b.odd;
      const lucro = retorno - total;
      return { ...b, stake, retorno, lucro };
    });

    const minLucro = Math.min(...distrib.map((d) => d.lucro));
    let risco: "baixo" | "medio" | "alto";
    if (margem < 0) risco = "baixo";
    else if (margem < 5) risco = "medio";
    else risco = "alto";

    const melhor = distrib.reduce((a, b) => (b.odd > a.odd ? b : a));

    return { distrib, margem, risco, minLucro, melhor };
  }, [valor, bests]);

  if (bests.length < 2) {
    return (
      <Card className="p-4 rounded-2xl shadow-soft">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-4 h-4 text-primary" />
          <p className="font-bold text-sm">Modo Inteligente de Apostas</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Necessário pelo menos 2 mercados com odds para gerar a estratégia inteligente.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4 rounded-2xl shadow-soft bg-gradient-to-br from-primary/5 via-transparent to-emerald-500/5 border-primary/20">
      <div className="flex items-center gap-2 mb-1">
        <div className="p-1.5 rounded-lg bg-primary/10">
          <Brain className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="font-bold text-sm">Modo Inteligente</p>
          <p className="text-[10px] text-muted-foreground">Distribuição otimizada entre casas</p>
        </div>
        <Badge variant="outline" className="ml-auto text-[9px] gap-1">
          <Sparkles className="w-3 h-3" /> Beta
        </Badge>
      </div>

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
        />
        <div className="flex gap-1.5 flex-wrap pt-1">
          {[5000, 10000, 25000, 50000].map((v) => (
            <Button
              key={v}
              size="sm"
              variant="outline"
              className="h-7 text-[11px] rounded-lg flex-1"
              onClick={() => setValor(String(v))}
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
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      @ {d.odd.toFixed(2)}
                    </Badge>
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
