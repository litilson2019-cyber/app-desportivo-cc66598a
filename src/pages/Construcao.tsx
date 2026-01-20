import { useState, useEffect, useMemo } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X, Loader2, Sparkles, TrendingUp, Shield, AlertTriangle, GitCompare } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useSystemConfig } from "@/hooks/useSystemConfig";
import { MarketSelector, MarketType } from "@/components/MarketSelector";
import { ConfidenceFilter, ConfidenceLevel } from "@/components/ConfidenceFilter";
import { ModeComparison } from "@/components/ModeComparison";

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
    mercado?: string;
    aposta_final: string;
    odd: number;
    probabilidade: number;
    motivo: string;
  }>;
  mercado_analisado?: string;
  odd_total: number;
  probabilidade_total: number;
  resumo: string;
}

export default function Construcao() {
  const [jogos, setJogos] = useState<Jogo[]>([
    { id: "1", equipa_a: "", equipa_b: "", odd_a: "", odd_b: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<ResultadoAnalise | null>(null);
  const [resultadoComparacao, setResultadoComparacao] = useState<{
    risco: ResultadoAnalise | null;
    seguro: ResultadoAnalise | null;
  } | null>(null);
  const [modo, setModo] = useState<"risco" | "seguro" | "comparar">("risco");
  const [selectedMarket, setSelectedMarket] = useState<MarketType>("nenhum");
  const [minConfidence, setMinConfidence] = useState<ConfidenceLevel>(70);
  const [saldo, setSaldo] = useState<number>(0);
  const [loadingSaldo, setLoadingSaldo] = useState(true);
  const { toast } = useToast();

  // Hook para buscar configurações do sistema
  const { config, loading: configLoading } = useSystemConfig();

  // Preço para comparação é o dobro (ambos os modos)
  const precoRisco = config.preco_modo_arriscado;
  const precoSeguro = config.preco_modo_seguro;
  const precoComparacao = precoRisco + precoSeguro;
  
  const precoAtual = modo === "comparar" ? precoComparacao : modo === "risco" ? precoRisco : precoSeguro;
  const limiteJogos = modo === "seguro" ? config.limite_jogos_seguro : config.limite_jogos_arriscado;
  const temSaldoSuficiente = saldo >= precoAtual;

  // Filtrar jogos por confiança mínima
  const filteredResultado = useMemo(() => {
    if (!resultado) return null;
    
    const jogosFiltrados = resultado.jogos.filter(j => j.probabilidade >= minConfidence);
    
    if (jogosFiltrados.length === 0) return { ...resultado, jogos: [], odd_total: 0, probabilidade_total: 0 };
    
    // Recalcular odd total e probabilidade média
    const oddTotal = jogosFiltrados.reduce((acc, j) => acc * j.odd, 1);
    const probMedia = jogosFiltrados.reduce((acc, j) => acc + j.probabilidade, 0) / jogosFiltrados.length;
    
    return {
      ...resultado,
      jogos: jogosFiltrados,
      odd_total: oddTotal,
      probabilidade_total: probMedia
    };
  }, [resultado, minConfidence]);

  const hiddenCount = resultado ? resultado.jogos.length - (filteredResultado?.jogos.length || 0) : 0;

  useEffect(() => {
    fetchSaldo();
  }, []);

  const fetchSaldo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("saldo")
          .eq("id", user.id)
          .single();
        
        if (profile) {
          setSaldo(Number(profile.saldo) || 0);
        }
      }
    } catch (error) {
      console.error("Erro ao buscar saldo:", error);
    } finally {
      setLoadingSaldo(false);
    }
  };

  const addJogo = () => {
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

    if (!temSaldoSuficiente) {
      toast({
        title: "Saldo insuficiente",
        description: `Você precisa de ${precoAtual} Kz para ${modo === "comparar" ? "comparar os modos" : `construir um bilhete no modo ${modo === "risco" ? "arriscado" : "seguro"}`}. Saldo atual: ${saldo.toFixed(2)} Kz`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResultado(null);
    setResultadoComparacao(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const saldoAnterior = saldo;
      const novoSaldo = saldoAnterior - precoAtual;
      const descontarApenasComResultados = config.desconto_apenas_com_resultados;

      if (modo === "comparar") {
        // Modo comparação: primeiro fazer a análise, depois decidir sobre o saldo
        const [riscoResult, seguroResult] = await Promise.all([
          supabase.functions.invoke("analisar-jogos", {
            body: { jogos: jogosValidos, modo: "risco", market: selectedMarket },
          }),
          supabase.functions.invoke("analisar-jogos", {
            body: { jogos: jogosValidos, modo: "seguro", market: selectedMarket },
          }),
        ]);

        if (riscoResult.error) throw riscoResult.error;
        if (seguroResult.error) throw seguroResult.error;

        const riscoData = riscoResult.data;
        const seguroData = seguroResult.data;
        
        // Verificar se há resultados
        const temResultados = (riscoData?.jogos?.length > 0) || (seguroData?.jogos?.length > 0);

        // Só descontar saldo se houver resultados OU se a configuração permitir desconto sempre
        if (!descontarApenasComResultados || temResultados) {
          const { error: saldoError } = await supabase
            .from("profiles")
            .update({ saldo: novoSaldo })
            .eq("id", user.id);
          
          if (saldoError) throw saldoError;
          setSaldo(novoSaldo);

          toast({
            title: "Comparação concluída!",
            description: `Análise de ambos os modos. ${precoAtual} Kz descontados.`,
          });
        } else {
          toast({
            title: "Sem resultados",
            description: "Nenhum resultado encontrado. Saldo não foi descontado.",
            variant: "default",
          });
        }

        setResultadoComparacao({
          risco: riscoData,
          seguro: seguroData,
        });
      } else {
        // Modo normal (risco ou seguro): primeiro fazer análise
        const iaResult = await supabase.functions.invoke("analisar-jogos", {
          body: { jogos: jogosValidos, modo, market: selectedMarket },
        });

        if (iaResult.error) throw iaResult.error;

        const data = iaResult.data;
        
        // Verificar se há resultados
        const temResultados = data?.jogos?.length > 0;

        // Só descontar saldo se houver resultados OU se a configuração permitir desconto sempre
        if (!descontarApenasComResultados || temResultados) {
          const { error: saldoError } = await supabase
            .from("profiles")
            .update({ saldo: novoSaldo })
            .eq("id", user.id);
          
          if (saldoError) throw saldoError;
          setSaldo(novoSaldo);

          // Inserir bilhete após termos os resultados e o saldo descontado
          const { error: bilheteError } = await supabase.from("bilhetes").insert({
            user_id: user.id,
            jogos: jogosValidos as any,
            mercados_recomendados: data.jogos as any,
            odds_totais: data.odd_total,
            analise_ia: data.resumo,
            probabilidade_estimada: data.probabilidade_total,
            modo,
          });

          if (bilheteError) {
            // Repor saldo caso falhe o registo do bilhete
            await supabase
              .from("profiles")
              .update({ saldo: saldoAnterior })
              .eq("id", user.id);
            setSaldo(saldoAnterior);
            throw bilheteError;
          }

          toast({
            title: "Bilhete construído!",
            description: `Análise completa. ${precoAtual} Kz descontados.`,
          });
        } else {
          toast({
            title: "Sem resultados",
            description: "Nenhum resultado encontrado para este mercado. Saldo não foi descontado.",
            variant: "default",
          });
        }

        setResultado(data);
      }
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
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={() => setModo("risco")}
                variant={modo === "risco" ? "default" : "outline"}
                className={`flex-1 min-w-[100px] h-12 font-semibold ${
                  modo === "risco"
                    ? "bg-gradient-primary text-white"
                    : "border-primary/30 text-foreground hover:bg-primary/10"
                }`}
              >
                🔵 Risco
              </Button>
              <Button
                onClick={() => setModo("seguro")}
                variant={modo === "seguro" ? "default" : "outline"}
                className={`flex-1 min-w-[100px] h-12 font-semibold ${
                  modo === "seguro"
                    ? "bg-emerald-500 text-white hover:bg-emerald-600"
                    : "border-emerald-500/30 text-foreground hover:bg-emerald-500/10"
                }`}
              >
                🟢 Seguro
              </Button>
              <Button
                onClick={() => setModo("comparar")}
                variant={modo === "comparar" ? "default" : "outline"}
                className={`flex-1 min-w-[100px] h-12 font-semibold ${
                  modo === "comparar"
                    ? "bg-gradient-to-r from-primary to-emerald-500 text-white"
                    : "border-purple-500/30 text-foreground hover:bg-purple-500/10"
                }`}
              >
                <GitCompare className="w-4 h-4 mr-1" />
                Comparar
              </Button>
            </div>
            
          {/* Saldo do usuário */}
          <div className="mt-4 p-3 bg-background rounded-xl flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Seu saldo:</span>
            <span className={`font-bold ${temSaldoSuficiente ? "text-success" : "text-destructive"}`}>
              {loadingSaldo || configLoading ? "..." : `${saldo.toFixed(2)} Kz`}
            </span>
          </div>
            
          {modo && (
            <div className="mt-4 p-4 bg-muted/30 rounded-xl space-y-2">
              <h3 className="font-semibold text-foreground">
                {modo === "comparar" ? "Modo Comparação" : modo === "risco" ? "Modo Arriscado" : "Modo Seguro"}
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                {modo === "comparar" ? (
                  <>
                    <li>• Analisa ambos os modos lado a lado</li>
                    <li>• Até {Math.min(config.limite_jogos_arriscado, config.limite_jogos_seguro)} jogos</li>
                    <li>• Preço: <span className="font-semibold text-foreground">{configLoading ? "..." : `${precoAtual} Kz`}</span> (Risco + Seguro)</li>
                  </>
                ) : (
                  <>
                    <li>• {modo === "risco" ? `Até ${config.limite_jogos_arriscado} jogos` : `Até ${config.limite_jogos_seguro} jogos`}</li>
                    <li>• {modo === "risco" ? "Alto potencial de retorno" : "Alta estabilidade"}</li>
                    <li>• Preço por análise: <span className="font-semibold text-foreground">{configLoading ? "..." : `${precoAtual} Kz`}</span></li>
                  </>
                )}
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

            {jogos.length < limiteJogos && (
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

          {/* Seletor de Mercado */}
          <MarketSelector 
            selectedMarket={selectedMarket} 
            onMarketChange={setSelectedMarket} 
          />

          {/* Filtro de Confiança */}
          <ConfidenceFilter
            minConfidence={minConfidence}
            onConfidenceChange={setMinConfidence}
          />

          <Button
            onClick={handleConstruirBilhete}
            disabled={loading || loadingSaldo || configLoading || !temSaldoSuficiente}
            className={`w-full rounded-xl h-14 text-lg font-bold transition-all ${
              temSaldoSuficiente 
                ? "bg-gradient-primary hover:opacity-90 text-white" 
                : "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
            }`}
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : !temSaldoSuficiente ? (
              <>Saldo Insuficiente ({precoAtual} Kz)</>
            ) : modo === "comparar" ? (
              <>
                <GitCompare className="w-6 h-6 mr-2" />
                Comparar Modos ({precoAtual} Kz)
              </>
            ) : (
              <>
                <Sparkles className="w-6 h-6 mr-2" />
                Construir Bilhete ({precoAtual} Kz)
              </>
            )}
          </Button>

          {/* Resultado da Comparação */}
          {resultadoComparacao && (
            <ModeComparison
              resultadoRisco={resultadoComparacao.risco}
              resultadoSeguro={resultadoComparacao.seguro}
              minConfidence={minConfidence}
            />
          )}

          {filteredResultado && (
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
                    {filteredResultado.mercado_analisado && filteredResultado.mercado_analisado !== "Pesquisa Geral" 
                      ? `Mercado: ${filteredResultado.mercado_analisado}` 
                      : "Pesquisa geral automática"}
                  </p>
                </div>
              </div>

              {/* Aviso de jogos ocultos */}
              {hiddenCount > 0 && (
                <div className="flex items-center gap-2 p-3 bg-warning/10 rounded-xl text-warning text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{hiddenCount} jogo(s) oculto(s) por estarem abaixo de {minConfidence}% de confiança</span>
                </div>
              )}

              {filteredResultado.jogos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-warning" />
                  <p className="font-medium">Nenhum resultado atinge a confiança mínima de {minConfidence}%</p>
                  <p className="text-sm mt-1">Reduza o filtro de confiança para ver mais resultados.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-muted/30 rounded-xl">
                      <p className="text-sm text-muted-foreground mb-1">
                        Odd Total
                      </p>
                      <p className="text-2xl font-bold text-foreground">
                        {filteredResultado.odd_total.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-muted/30 rounded-xl">
                      <p className="text-sm text-muted-foreground mb-1">
                        Probabilidade
                      </p>
                      <p className="text-2xl font-bold text-success">
                        {filteredResultado.probabilidade_total.toFixed(0)}%
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {filteredResultado.jogos.map((jogo, index) => {
                  // Determinar cor baseada no score de confiança
                  const getConfidenceColor = (prob: number) => {
                    if (prob >= 85) return "bg-success"; // Verde - Alta confiança
                    if (prob >= 75) return "bg-primary"; // Azul - Boa confiança
                    if (prob >= 70) return "bg-warning"; // Amarelo - Confiança moderada
                    return "bg-destructive"; // Vermelho - Baixa confiança
                  };
                  
                  const getConfidenceLabel = (prob: number) => {
                    if (prob >= 85) return "Muito Alta";
                    if (prob >= 75) return "Alta";
                    if (prob >= 70) return "Moderada";
                    return "Baixa";
                  };
                  
                  const getConfidenceBadgeColor = (prob: number) => {
                    if (prob >= 85) return "bg-success/20 text-success";
                    if (prob >= 75) return "bg-primary/20 text-primary";
                    if (prob >= 70) return "bg-warning/20 text-warning";
                    return "bg-destructive/20 text-destructive";
                  };
                  
                  return (
                    <div
                      key={index}
                      className="p-4 bg-background rounded-xl space-y-3 animate-fade-in"
                      style={{ animationDelay: `${index * 150}ms`, animationFillMode: 'both' }}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-foreground">
                          {jogo.equipa_a} vs {jogo.equipa_b}
                        </h4>
                        <span className={`text-xs px-2 py-1 rounded-full font-bold ${getConfidenceBadgeColor(jogo.probabilidade)}`}>
                          {jogo.probabilidade}%
                        </span>
                      </div>
                      
                      {/* Barra de progresso do Score de Confiança com animação */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Shield className="h-3 w-3" />
                            Score de Confiança
                          </span>
                          <span className={`font-medium ${getConfidenceBadgeColor(jogo.probabilidade).split(' ')[1]}`}>
                            {getConfidenceLabel(jogo.probabilidade)}
                          </span>
                        </div>
                        <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                          <div 
                            className={`h-full ${getConfidenceColor(jogo.probabilidade)} animate-[progress-fill_0.8s_ease-out_forwards]`}
                            style={{ 
                              '--progress-width': `${Math.min(jogo.probabilidade, 100)}%`,
                              animationDelay: `${index * 150 + 200}ms`
                            } as React.CSSProperties}
                          />
                        </div>
                      </div>
                      
                      {/* Mercado utilizado */}
                      {jogo.mercado && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                            📊 {jogo.mercado}
                          </span>
                        </div>
                      )}
                      
                      {/* UMA aposta final por jogo */}
                      <div className="flex items-center justify-between p-3 bg-primary/10 rounded-xl">
                        <span className="text-base font-bold text-primary">
                          🎯 {jogo.aposta_final}
                        </span>
                        <span className="text-lg font-bold text-foreground">
                          @ {jogo.odd.toFixed(2)}
                        </span>
                      </div>
                      
                      <p className="text-sm text-muted-foreground italic">
                        💡 {jogo.motivo}
                      </p>
                    </div>
                  );
                })}
                  </div>

                  <div className="p-4 bg-muted/30 rounded-xl">
                    <h3 className="font-semibold text-foreground mb-2">
                      Resumo
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {filteredResultado.resumo}
                    </p>
                  </div>
                </>
              )}
            </Card>
          )}
        </div>
      </div>
      <BottomNav />
    </AuthGuard>
  );
}
