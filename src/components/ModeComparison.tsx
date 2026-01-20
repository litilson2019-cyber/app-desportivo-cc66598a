import { Card } from "@/components/ui/card";
import { Shield, TrendingUp, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface JogoResultado {
  equipa_a: string;
  equipa_b: string;
  mercado?: string;
  aposta_final: string;
  odd: number;
  probabilidade: number;
  motivo: string;
}

interface ResultadoAnalise {
  jogos: JogoResultado[];
  mercado_analisado?: string;
  odd_total: number;
  probabilidade_total: number;
  resumo: string;
}

interface ModeComparisonProps {
  resultadoRisco: ResultadoAnalise | null;
  resultadoSeguro: ResultadoAnalise | null;
  minConfidence: number;
}

export function ModeComparison({ resultadoRisco, resultadoSeguro, minConfidence }: ModeComparisonProps) {
  const filterByConfidence = (resultado: ResultadoAnalise | null) => {
    if (!resultado) return null;
    
    const jogosFiltrados = resultado.jogos.filter(j => j.probabilidade >= minConfidence);
    
    if (jogosFiltrados.length === 0) return { ...resultado, jogos: [], odd_total: 0, probabilidade_total: 0 };
    
    const oddTotal = jogosFiltrados.reduce((acc, j) => acc * j.odd, 1);
    const probMedia = jogosFiltrados.reduce((acc, j) => acc + j.probabilidade, 0) / jogosFiltrados.length;
    
    return {
      ...resultado,
      jogos: jogosFiltrados,
      odd_total: oddTotal,
      probabilidade_total: probMedia
    };
  };

  const riscoFiltered = filterByConfidence(resultadoRisco);
  const seguroFiltered = filterByConfidence(resultadoSeguro);

  const getConfidenceColor = (prob: number) => {
    if (prob >= 85) return "bg-success";
    if (prob >= 75) return "bg-primary";
    if (prob >= 70) return "bg-warning";
    return "bg-destructive";
  };

  const getConfidenceBadgeColor = (prob: number) => {
    if (prob >= 85) return "bg-success/20 text-success";
    if (prob >= 75) return "bg-primary/20 text-primary";
    if (prob >= 70) return "bg-warning/20 text-warning";
    return "bg-destructive/20 text-destructive";
  };

  if (!riscoFiltered && !seguroFiltered) return null;

  // Agrupar jogos por equipa para comparação lado a lado
  const allGames = new Set<string>();
  riscoFiltered?.jogos.forEach(j => allGames.add(`${j.equipa_a} vs ${j.equipa_b}`));
  seguroFiltered?.jogos.forEach(j => allGames.add(`${j.equipa_a} vs ${j.equipa_b}`));

  return (
    <Card className="p-6 shadow-medium rounded-2xl space-y-4 bg-gradient-card">
      <div className="flex items-center gap-3 pb-4 border-b border-border">
        <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center">
          <TrendingUp className="w-7 h-7 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">
            Comparação de Modos
          </h2>
          <p className="text-sm text-muted-foreground">
            Risco vs Seguro lado a lado
          </p>
        </div>
      </div>

      {/* Resumo dos totais */}
      <div className="grid grid-cols-2 gap-3">
        {/* Coluna Risco */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🔵</span>
            <span className="font-bold text-primary text-sm">Modo Risco</span>
          </div>
          {riscoFiltered && riscoFiltered.jogos.length > 0 ? (
            <div className="p-3 bg-primary/10 rounded-xl space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Odd Total:</span>
                <span className="font-bold text-foreground">{riscoFiltered.odd_total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Probabilidade:</span>
                <span className="font-bold text-success">{riscoFiltered.probabilidade_total.toFixed(0)}%</span>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-muted/30 rounded-xl text-xs text-muted-foreground text-center">
              Sem resultados ≥{minConfidence}%
            </div>
          )}
        </div>

        {/* Coluna Seguro */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🟢</span>
            <span className="font-bold text-emerald-500 text-sm">Modo Seguro</span>
          </div>
          {seguroFiltered && seguroFiltered.jogos.length > 0 ? (
            <div className="p-3 bg-emerald-500/10 rounded-xl space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Odd Total:</span>
                <span className="font-bold text-foreground">{seguroFiltered.odd_total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Probabilidade:</span>
                <span className="font-bold text-success">{seguroFiltered.probabilidade_total.toFixed(0)}%</span>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-muted/30 rounded-xl text-xs text-muted-foreground text-center">
              Sem resultados ≥{minConfidence}%
            </div>
          )}
        </div>
      </div>

      {/* Comparação por jogo */}
      <div className="space-y-4">
        {Array.from(allGames).map((gameKey, index) => {
          const riscoJogo = riscoFiltered?.jogos.find(j => `${j.equipa_a} vs ${j.equipa_b}` === gameKey);
          const seguroJogo = seguroFiltered?.jogos.find(j => `${j.equipa_a} vs ${j.equipa_b}` === gameKey);

          return (
            <div
              key={index}
              className="p-4 bg-background rounded-xl space-y-3 animate-fade-in"
              style={{ animationDelay: `${index * 150}ms`, animationFillMode: 'both' }}
            >
              <h4 className="font-semibold text-foreground text-center pb-2 border-b border-border">
                {gameKey}
              </h4>

              <div className="grid grid-cols-2 gap-3">
                {/* Sugestão Risco */}
                <div className={cn(
                  "p-3 rounded-xl space-y-2",
                  riscoJogo ? "bg-primary/5 border border-primary/20" : "bg-muted/20"
                )}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-primary">🔵 Risco</span>
                    {riscoJogo && (
                      <span className={cn("text-xs px-1.5 py-0.5 rounded-full font-bold", getConfidenceBadgeColor(riscoJogo.probabilidade))}>
                        {riscoJogo.probabilidade}%
                      </span>
                    )}
                  </div>
                  
                  {riscoJogo ? (
                    <>
                      {riscoJogo.mercado && (
                        <p className="text-xs text-muted-foreground">📊 {riscoJogo.mercado}</p>
                      )}
                      <p className="text-sm font-semibold text-foreground">
                        🎯 {riscoJogo.aposta_final}
                      </p>
                      <p className="text-sm font-bold text-primary">
                        @ {riscoJogo.odd.toFixed(2)}
                      </p>
                      
                      {/* Progress bar */}
                      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                        <div 
                          className={cn("h-full transition-all", getConfidenceColor(riscoJogo.probabilidade))}
                          style={{ width: `${Math.min(riscoJogo.probabilidade, 100)}%` }}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center py-4 text-muted-foreground">
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      <span className="text-xs">Abaixo do filtro</span>
                    </div>
                  )}
                </div>

                {/* Sugestão Seguro */}
                <div className={cn(
                  "p-3 rounded-xl space-y-2",
                  seguroJogo ? "bg-emerald-500/5 border border-emerald-500/20" : "bg-muted/20"
                )}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-emerald-500">🟢 Seguro</span>
                    {seguroJogo && (
                      <span className={cn("text-xs px-1.5 py-0.5 rounded-full font-bold", getConfidenceBadgeColor(seguroJogo.probabilidade))}>
                        {seguroJogo.probabilidade}%
                      </span>
                    )}
                  </div>
                  
                  {seguroJogo ? (
                    <>
                      {seguroJogo.mercado && (
                        <p className="text-xs text-muted-foreground">📊 {seguroJogo.mercado}</p>
                      )}
                      <p className="text-sm font-semibold text-foreground">
                        🎯 {seguroJogo.aposta_final}
                      </p>
                      <p className="text-sm font-bold text-emerald-500">
                        @ {seguroJogo.odd.toFixed(2)}
                      </p>
                      
                      {/* Progress bar */}
                      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                        <div 
                          className={cn("h-full transition-all", getConfidenceColor(seguroJogo.probabilidade))}
                          style={{ width: `${Math.min(seguroJogo.probabilidade, 100)}%` }}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center py-4 text-muted-foreground">
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      <span className="text-xs">Abaixo do filtro</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Resumos */}
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
        <div className="p-3 bg-primary/5 rounded-xl">
          <h4 className="text-xs font-semibold text-primary mb-1">Resumo Risco</h4>
          <p className="text-xs text-muted-foreground line-clamp-3">
            {riscoFiltered?.resumo || "Sem análise disponível"}
          </p>
        </div>
        <div className="p-3 bg-emerald-500/5 rounded-xl">
          <h4 className="text-xs font-semibold text-emerald-500 mb-1">Resumo Seguro</h4>
          <p className="text-xs text-muted-foreground line-clamp-3">
            {seguroFiltered?.resumo || "Sem análise disponível"}
          </p>
        </div>
      </div>
    </Card>
  );
}
