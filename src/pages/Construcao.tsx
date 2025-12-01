import { useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X, Loader2, Sparkles, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Jogo {
  id: string;
  equipa_a: string;
  equipa_b: string;
  odd_a: string;
  odd_b: string;
}

interface ResultadoAnalise {
  jogos: Array<{
    equipa_a: string;
    equipa_b: string;
    mercado_recomendado: string;
    odd_final: number;
    analise: string;
  }>;
  odd_total: number;
  probabilidade: number;
  analise_geral: string;
}

export default function Construcao() {
  const [jogos, setJogos] = useState<Jogo[]>([
    { id: "1", equipa_a: "", equipa_b: "", odd_a: "", odd_b: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<ResultadoAnalise | null>(null);
  const [modo, setModo] = useState<"risco" | "seguro">("risco");
  const { toast } = useToast();

  const addJogo = () => {
    const limiteJogos = modo === "seguro" ? 3 : modo === "risco" ? 5 : 12;
    
    if (jogos.length >= limiteJogos) {
      toast({
        title: "Limite atingido",
        description: `Você pode adicionar no máximo ${limiteJogos} jogos no modo ${modo === "seguro" ? "seguro" : "arriscado"}.`,
        variant: "destructive",
      });
      return;
    }

    setJogos([
      ...jogos,
      {
        id: Date.now().toString(),
        equipa_a: "",
        equipa_b: "",
        odd_a: "",
        odd_b: "",
      },
    ]);
  };

  const removeJogo = (id: string) => {
    if (jogos.length === 1) return;
    setJogos(jogos.filter((j) => j.id !== id));
  };

  const updateJogo = (id: string, field: keyof Jogo, value: string) => {
    setJogos(
      jogos.map((j) => (j.id === id ? { ...j, [field]: value } : j))
    );
  };

  const handleConstruirBilhete = async () => {
    const jogosValidos = jogos.filter(
      (j) => j.equipa_a && j.equipa_b && j.odd_a && j.odd_b
    );

    if (jogosValidos.length === 0) {
      toast({
        title: "Dados incompletos",
        description: "Preencha pelo menos um jogo completo.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "analisar-jogos",
        {
          body: { jogos: jogosValidos, modo },
        }
      );

      if (error) throw error;

      setResultado(data);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("bilhetes").insert([{
          user_id: user.id,
          jogos: jogosValidos as any,
          mercados_recomendados: data.jogos as any,
          odds_totais: data.odd_total,
          analise_ia: data.analise_geral,
          probabilidade_estimada: data.probabilidade,
        }]);
      }

      toast({
        title: "Bilhete construído!",
        description: "Análise completa da IA disponível.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível analisar os jogos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-subtle pb-20 p-4">
        <div className="max-w-2xl mx-auto pt-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Construção de Bilhete
            </h1>
            <p className="text-muted-foreground mt-1">
              Adicione jogos e deixe a IA analisar
            </p>
          </div>

          {/* Modo de Análise */}
          <Card className="p-4 shadow-soft rounded-2xl">
            <div className="flex gap-3">
              <Button
                onClick={() => setModo("risco")}
                variant={modo === "risco" ? "default" : "outline"}
                className={`flex-1 h-12 font-semibold ${
                  modo === "risco"
                    ? "bg-gradient-primary text-white"
                    : "border-primary/30 text-foreground hover:bg-primary/10"
                }`}
              >
                🔵 Modo Risco
              </Button>
              <Button
                onClick={() => setModo("seguro")}
                variant={modo === "seguro" ? "default" : "outline"}
                className={`flex-1 h-12 font-semibold ${
                  modo === "seguro"
                    ? "bg-emerald-500 text-white hover:bg-emerald-600"
                    : "border-emerald-500/30 text-foreground hover:bg-emerald-500/10"
                }`}
              >
                🟢 Modo Seguro
              </Button>
            </div>
            
            {modo && (
              <div className="mt-4 p-4 bg-muted/30 rounded-xl space-y-2">
                <h3 className="font-semibold text-foreground">
                  {modo === "risco" ? "Modo Arriscado" : "Modo Seguro"}
                </h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• {modo === "risco" ? "Até 5 jogos" : "Até 3 jogos"}</li>
                  <li>• {modo === "risco" ? "Alto potencial de retorno" : "Alta estabilidade"}</li>
                  <li>• Preço por análise: 1 Bilhete {modo === "risco" ? "300 Kz" : "500 Kz"}</li>
                </ul>
              </div>
            )}
          </Card>

          <div className="space-y-4">
            {jogos.map((jogo, index) => (
              <Card key={jogo.id} className="p-4 shadow-soft rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">
                    Jogo {index + 1}
                  </h3>
                  {jogos.length > 1 && (
                    <button
                      onClick={() => removeJogo(jogo.id)}
                      className="text-destructive hover:text-destructive/80"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Equipa A</Label>
                    <Input
                      value={jogo.equipa_a}
                      onChange={(e) =>
                        updateJogo(jogo.id, "equipa_a", e.target.value)
                      }
                      placeholder="Nome da equipa"
                      className="rounded-xl mt-1"
                    />
                  </div>
                  <div>
                    <Label>Odd A</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={jogo.odd_a}
                      onChange={(e) =>
                        updateJogo(jogo.id, "odd_a", e.target.value)
                      }
                      placeholder="1.50"
                      className="rounded-xl mt-1"
                    />
                  </div>
                  <div>
                    <Label>Equipa B</Label>
                    <Input
                      value={jogo.equipa_b}
                      onChange={(e) =>
                        updateJogo(jogo.id, "equipa_b", e.target.value)
                      }
                      placeholder="Nome da equipa"
                      className="rounded-xl mt-1"
                    />
                  </div>
                  <div>
                    <Label>Odd B</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={jogo.odd_b}
                      onChange={(e) =>
                        updateJogo(jogo.id, "odd_b", e.target.value)
                      }
                      placeholder="2.50"
                      className="rounded-xl mt-1"
                    />
                  </div>
                </div>
              </Card>
            ))}

            {jogos.length < (modo === "seguro" ? 3 : modo === "risco" ? 5 : 12) && (
              <Button
                onClick={addJogo}
                variant="outline"
                className="w-full rounded-xl h-12 border-dashed border-2"
              >
                <Plus className="w-5 h-5 mr-2" />
                Adicionar Jogo
              </Button>
            )}
          </div>

          <Button
            onClick={handleConstruirBilhete}
            disabled={loading}
            className="w-full bg-gradient-primary hover:opacity-90 text-white rounded-xl h-14 text-lg font-bold"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <Sparkles className="w-6 h-6 mr-2" />
                Construir Bilhete com IA
              </>
            )}
          </Button>

          {resultado && (
            <Card className="p-6 shadow-medium rounded-2xl space-y-4 bg-gradient-card">
              <div className="flex items-center gap-3 pb-4 border-b border-border">
                <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center">
                  <TrendingUp className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    Análise da IA
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Bilhete otimizado automaticamente
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-muted/30 rounded-xl">
                  <p className="text-sm text-muted-foreground mb-1">
                    Odd Total
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {resultado.odd_total.toFixed(2)}
                  </p>
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-xl">
                  <p className="text-sm text-muted-foreground mb-1">
                    Probabilidade
                  </p>
                  <p className="text-2xl font-bold text-success">
                    {resultado.probabilidade.toFixed(0)}%
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {resultado.jogos.map((jogo, index) => (
                  <div
                    key={index}
                    className="p-4 bg-background rounded-xl space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-foreground">
                        {jogo.equipa_a} vs {jogo.equipa_b}
                      </h4>
                      <span className="text-sm font-bold text-primary">
                        @ {jogo.odd_final}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 bg-accent/10 text-accent rounded-full font-medium">
                        {jogo.mercado_recomendado}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {jogo.analise}
                    </p>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-muted/30 rounded-xl">
                <h3 className="font-semibold text-foreground mb-2">
                  Análise Geral
                </h3>
                <p className="text-sm text-muted-foreground">
                  {resultado.analise_geral}
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
      <BottomNav />
    </AuthGuard>
  );
}
