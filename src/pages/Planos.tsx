import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Plano {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  limite_construcoes: number;
  limite_jogos: number;
  acesso_mercados_avancados: boolean;
  verificacao_automatica: boolean;
}

export default function Planos() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadPlanos();
  }, []);

  const loadPlanos = async () => {
    try {
      const { data, error } = await supabase
        .from("planos")
        .select("*")
        .order("preco");

      if (error) throw error;
      setPlanos(data || []);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os planos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlano = async (planoId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({ plano_id: planoId })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Plano atualizado!",
        description: "Seu plano foi alterado com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex items-center justify-center min-h-screen bg-gradient-subtle">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-subtle pb-20 p-4">
        <div className="max-w-4xl mx-auto pt-6">
          <h1 className="text-3xl font-bold mb-2 text-foreground">
            Escolha seu Plano
          </h1>
          <p className="text-muted-foreground mb-8">
            Selecione o plano ideal para suas necessidades
          </p>

          <div className="grid md:grid-cols-3 gap-4">
            {planos.map((plano) => (
              <Card
                key={plano.id}
                className="p-6 shadow-soft hover:shadow-medium transition-shadow rounded-2xl"
              >
                <h3 className="text-xl font-bold mb-2 text-foreground">
                  {plano.nome}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {plano.descricao}
                </p>

                <div className="mb-6">
                  <span className="text-3xl font-bold text-foreground">
                    {plano.preco.toFixed(0)}
                  </span>
                  <span className="text-muted-foreground ml-2">Kzs/mês</span>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-foreground">
                      {plano.limite_construcoes} construções/dia
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-foreground">
                      Máx. {plano.limite_jogos} jogos por bilhete
                    </span>
                  </div>
                  {plano.acesso_mercados_avancados && (
                    <div className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-foreground">
                        Mercados avançados
                      </span>
                    </div>
                  )}
                  {plano.verificacao_automatica && (
                    <div className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-foreground">
                        Verificação automática
                      </span>
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => handleSelectPlano(plano.id)}
                  className="w-full bg-gradient-primary hover:opacity-90 text-white rounded-xl h-11 font-semibold"
                >
                  Selecionar Plano
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </div>
      <BottomNav />
    </AuthGuard>
  );
}
