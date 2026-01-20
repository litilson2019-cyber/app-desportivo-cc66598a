import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Target, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type MarketType = 
  | "nenhum"
  | "resultado"
  | "total_golos"
  | "btts"
  | "handicap"
  | "partes"
  | "minuto_golo"
  | "remates"
  | "faltas"
  | "cantos"
  | "cartoes"
  | "resultado_exato";

interface Market {
  id: MarketType;
  label: string;
  description: string;
}

const MARKETS: Market[] = [
  { 
    id: "nenhum", 
    label: "Nenhum", 
    description: "Pesquisa geral automática" 
  },
  { 
    id: "resultado", 
    label: "Resultado do Jogo", 
    description: "1X2 e Dupla Chance" 
  },
  { 
    id: "total_golos", 
    label: "Total de Golos", 
    description: "Mais/Menos de 0.5 a 4.5+" 
  },
  { 
    id: "btts", 
    label: "Ambas Marcam", 
    description: "Sim ou Não (BTTS)" 
  },
  { 
    id: "handicap", 
    label: "Handicap", 
    description: "Handicap positivo e negativo" 
  },
  { 
    id: "partes", 
    label: "Partes do Jogo", 
    description: "1ª e 2ª parte separadas" 
  },
  { 
    id: "minuto_golo", 
    label: "Minuto do 1º Golo", 
    description: "Quando será o primeiro golo" 
  },
  { 
    id: "remates", 
    label: "Remates", 
    description: "Remates por equipa e totais" 
  },
  { 
    id: "faltas", 
    label: "Faltas", 
    description: "Faltas por equipa e totais" 
  },
  { 
    id: "cantos", 
    label: "Cantos", 
    description: "Cantos por equipa e totais" 
  },
  { 
    id: "cartoes", 
    label: "Cartões", 
    description: "Amarelos e vermelhos por equipa" 
  },
  { 
    id: "resultado_exato", 
    label: "Resultado Exacto", 
    description: "Análise profunda do placar" 
  },
];

interface MarketSelectorProps {
  selectedMarket: MarketType;
  onMarketChange: (market: MarketType) => void;
}

export function MarketSelector({ selectedMarket, onMarketChange }: MarketSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const selectedMarketInfo = MARKETS.find(m => m.id === selectedMarket) || MARKETS[0];

  return (
    <Card className="p-4 shadow-soft rounded-2xl overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Target className="w-5 h-5 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-foreground text-sm">Selecionar Mercado</h3>
            <p className="text-xs text-muted-foreground">
              {selectedMarket === "nenhum" 
                ? "Pesquisa geral automática" 
                : selectedMarketInfo.label}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedMarket !== "nenhum" && (
            <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full font-medium">
              {selectedMarketInfo.label}
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isExpanded ? "max-h-[500px] opacity-100 mt-4" : "max-h-0 opacity-0"
        )}
      >
        <div className="space-y-2 pt-2 border-t border-border">
          {MARKETS.map((market) => (
            <button
              key={market.id}
              onClick={() => {
                onMarketChange(market.id);
                setIsExpanded(false);
              }}
              className={cn(
                "w-full flex items-center justify-between p-3 rounded-xl transition-all",
                selectedMarket === market.id
                  ? "bg-primary/10 border border-primary/30"
                  : "bg-muted/30 hover:bg-muted/50 border border-transparent"
              )}
            >
              <div className="text-left">
                <p className={cn(
                  "font-medium text-sm",
                  selectedMarket === market.id ? "text-primary" : "text-foreground"
                )}>
                  {market.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {market.description}
                </p>
              </div>
              {selectedMarket === market.id && (
                <Check className="w-5 h-5 text-primary" />
              )}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}

export { MARKETS };
