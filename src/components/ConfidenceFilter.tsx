import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Filter, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type ConfidenceLevel = 60 | 65 | 70 | 75 | 80 | 85;

interface ConfidenceOption {
  value: ConfidenceLevel;
  label: string;
  description: string;
}

const CONFIDENCE_OPTIONS: ConfidenceOption[] = [
  { value: 60, label: "60%", description: "Mostrar todos os resultados" },
  { value: 65, label: "65%", description: "Confiança mínima" },
  { value: 70, label: "70%", description: "Confiança moderada" },
  { value: 75, label: "75%", description: "Alta confiança" },
  { value: 80, label: "80%", description: "Muito alta confiança" },
  { value: 85, label: "85%", description: "Máxima confiança" },
];

interface ConfidenceFilterProps {
  minConfidence: ConfidenceLevel;
  onConfidenceChange: (confidence: ConfidenceLevel) => void;
}

export function ConfidenceFilter({ minConfidence, onConfidenceChange }: ConfidenceFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const selectedOption = CONFIDENCE_OPTIONS.find(o => o.value === minConfidence) || CONFIDENCE_OPTIONS[2];

  const getConfidenceColor = (value: ConfidenceLevel) => {
    if (value >= 85) return "text-success";
    if (value >= 75) return "text-primary";
    if (value >= 70) return "text-warning";
    return "text-muted-foreground";
  };

  return (
    <Card className="p-4 shadow-soft rounded-2xl overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
            <Filter className="w-5 h-5 text-warning" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-foreground text-sm">Filtro de Confiança</h3>
            <p className="text-xs text-muted-foreground">
              Mínimo: {selectedOption.label}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-sm font-bold px-2 py-1 rounded-full",
            minConfidence >= 75 ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
          )}>
            ≥{minConfidence}%
          </span>
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
          isExpanded ? "max-h-[400px] opacity-100 mt-4" : "max-h-0 opacity-0"
        )}
      >
        <div className="space-y-2 pt-2 border-t border-border">
          {CONFIDENCE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onConfidenceChange(option.value);
                setIsExpanded(false);
              }}
              className={cn(
                "w-full flex items-center justify-between p-3 rounded-xl transition-all",
                minConfidence === option.value
                  ? "bg-warning/10 border border-warning/30"
                  : "bg-muted/30 hover:bg-muted/50 border border-transparent"
              )}
            >
              <div className="text-left">
                <p className={cn(
                  "font-medium text-sm",
                  minConfidence === option.value ? "text-warning" : "text-foreground"
                )}>
                  {option.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {option.description}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("text-xs font-medium", getConfidenceColor(option.value))}>
                  {option.value >= 80 ? "⭐" : option.value >= 70 ? "✓" : ""}
                </span>
                {minConfidence === option.value && (
                  <Check className="w-5 h-5 text-warning" />
                )}
              </div>
            </button>
          ))}
        </div>
        
        <p className="text-xs text-muted-foreground mt-3 p-2 bg-muted/20 rounded-lg">
          💡 Resultados abaixo do mínimo selecionado serão ocultados da análise.
        </p>
      </div>
    </Card>
  );
}

export { CONFIDENCE_OPTIONS };
