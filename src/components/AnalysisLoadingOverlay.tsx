import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Search, 
  Database, 
  Brain, 
  BarChart3, 
  CheckCircle2, 
  Loader2,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AnalysisStep {
  id: string;
  label: string;
  icon: React.ElementType;
  duration: number; // in ms
}

const ANALYSIS_STEPS: AnalysisStep[] = [
  { id: "collect", label: "Recolhendo dados das equipas...", icon: Database, duration: 1500 },
  { id: "search", label: "Pesquisando estatísticas...", icon: Search, duration: 2000 },
  { id: "analyze", label: "Analisando probabilidades...", icon: Brain, duration: 2500 },
  { id: "calculate", label: "Calculando melhores apostas...", icon: BarChart3, duration: 2000 },
  { id: "finalize", label: "Finalizando recomendações...", icon: Sparkles, duration: 1500 },
];

interface AnalysisLoadingOverlayProps {
  isLoading: boolean;
  modo: "risco" | "seguro" | "comparar";
}

export function AnalysisLoadingOverlay({ isLoading, modo }: AnalysisLoadingOverlayProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepProgress, setStepProgress] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  useEffect(() => {
    if (!isLoading) {
      setCurrentStepIndex(0);
      setStepProgress(0);
      setCompletedSteps([]);
      return;
    }

    let stepTimeout: ReturnType<typeof setTimeout>;
    let progressInterval: ReturnType<typeof setInterval>;

    const runStep = (index: number) => {
      if (index >= ANALYSIS_STEPS.length) return;

      const step = ANALYSIS_STEPS[index];
      setCurrentStepIndex(index);
      setStepProgress(0);

      // Animate progress for this step
      const progressIncrement = 100 / (step.duration / 50);
      progressInterval = setInterval(() => {
        setStepProgress(prev => {
          const next = prev + progressIncrement;
          return next >= 100 ? 100 : next;
        });
      }, 50);

      // Move to next step
      stepTimeout = setTimeout(() => {
        clearInterval(progressInterval);
        setCompletedSteps(prev => [...prev, step.id]);
        setStepProgress(100);
        
        if (index < ANALYSIS_STEPS.length - 1) {
          setTimeout(() => runStep(index + 1), 200);
        }
      }, step.duration);
    };

    runStep(0);

    return () => {
      clearTimeout(stepTimeout);
      clearInterval(progressInterval);
    };
  }, [isLoading]);

  if (!isLoading) return null;

  const modoLabel = modo === "comparar" 
    ? "Comparação de Modos" 
    : modo === "risco" 
      ? "Modo Arriscado" 
      : "Modo Seguro";

  const modoColor = modo === "comparar" 
    ? "from-primary to-emerald-500" 
    : modo === "risco" 
      ? "from-primary to-blue-400" 
      : "from-emerald-500 to-green-400";

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <Card className="w-full max-w-md p-6 shadow-xl rounded-2xl border-primary/20">
        {/* Header */}
        <div className="text-center mb-6">
          <div className={cn(
            "w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br flex items-center justify-center mb-4",
            modoColor
          )}>
            <Brain className="w-8 h-8 text-white animate-pulse" />
          </div>
          <h3 className="text-xl font-bold text-foreground">Análise em Progresso</h3>
          <p className="text-sm text-muted-foreground mt-1">{modoLabel}</p>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {ANALYSIS_STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isCompleted = completedSteps.includes(step.id);
            const isCurrent = currentStepIndex === index && !isCompleted;
            const isPending = index > currentStepIndex;

            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl transition-all duration-300",
                  isCompleted && "bg-success/10",
                  isCurrent && "bg-primary/10",
                  isPending && "opacity-40"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                  isCompleted && "bg-success/20",
                  isCurrent && "bg-primary/20",
                  isPending && "bg-muted/30"
                )}>
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  ) : isCurrent ? (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  ) : (
                    <StepIcon className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium truncate",
                    isCompleted && "text-success",
                    isCurrent && "text-primary",
                    isPending && "text-muted-foreground"
                  )}>
                    {step.label}
                  </p>
                  
                  {isCurrent && (
                    <div className="mt-2">
                      <Progress 
                        value={stepProgress} 
                        className="h-1.5 bg-primary/20"
                      />
                    </div>
                  )}
                </div>

                {isCompleted && (
                  <span className="text-xs text-success font-medium">✓</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-border">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>A IA está a trabalhar para si...</span>
          </div>
        </div>
      </Card>
    </div>
  );
}