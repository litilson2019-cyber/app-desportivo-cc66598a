import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowDown, ArrowUp, Wallet, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Transacao {
  id: string;
  tipo: string;
  valor: number;
  status: string;
  descricao: string;
  created_at: string;
}

export default function Fundos() {
  const [saldo, setSaldo] = useState(0);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [valor, setValor] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("saldo")
        .eq("id", user.id)
        .single();

      if (profile) {
        setSaldo(Number(profile.saldo));
      }

      const { data: transacoesData } = await supabase
        .from("transacoes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      setTransacoes(transacoesData || []);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeposito = async () => {
    if (!valor || Number(valor) <= 0) {
      toast({
        title: "Valor inválido",
        description: "Digite um valor válido para depósito.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("transacoes").insert({
        user_id: user.id,
        tipo: "deposito",
        valor: Number(valor),
        status: "concluido",
        descricao: "Depósito realizado",
      });

      await supabase.rpc("increment_saldo", {
        user_id: user.id,
        amount: Number(valor),
      });

      toast({
        title: "Depósito realizado!",
        description: `${Number(valor).toFixed(2)} Kzs adicionados à sua conta.`,
      });

      setValor("");
      loadData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleLevantamento = async () => {
    if (!valor || Number(valor) <= 0) {
      toast({
        title: "Valor inválido",
        description: "Digite um valor válido para levantamento.",
        variant: "destructive",
      });
      return;
    }

    if (Number(valor) > saldo) {
      toast({
        title: "Saldo insuficiente",
        description: "Você não tem saldo suficiente para este levantamento.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("transacoes").insert({
        user_id: user.id,
        tipo: "levantamento",
        valor: Number(valor),
        status: "pendente",
        descricao: "Levantamento solicitado",
      });

      toast({
        title: "Levantamento solicitado",
        description: "Sua solicitação está em análise.",
      });

      setValor("");
      loadData();
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
        <div className="max-w-2xl mx-auto pt-6 space-y-6">
          <h1 className="text-3xl font-bold text-foreground">Fundos</h1>

          <Card className="p-6 bg-gradient-primary shadow-strong rounded-2xl">
            <div className="flex items-center gap-3 mb-2">
              <Wallet className="w-6 h-6 text-white" />
              <span className="text-white/90 text-sm font-medium">Saldo Disponível</span>
            </div>
            <p className="text-4xl font-bold text-white">
              {saldo.toFixed(2)} <span className="text-xl">Kzs</span>
            </p>
          </Card>

          <Tabs defaultValue="deposito" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="deposito">Depósito</TabsTrigger>
              <TabsTrigger value="levantamento">Levantamento</TabsTrigger>
            </TabsList>

            <TabsContent value="deposito">
              <Card className="p-6 shadow-soft rounded-2xl">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="valor-deposito">Valor (Kzs)</Label>
                    <Input
                      id="valor-deposito"
                      type="number"
                      value={valor}
                      onChange={(e) => setValor(e.target.value)}
                      placeholder="0.00"
                      className="rounded-xl mt-2"
                    />
                  </div>
                  <Button
                    onClick={handleDeposito}
                    className="w-full bg-gradient-primary hover:opacity-90 text-white rounded-xl h-12 font-semibold"
                  >
                    <ArrowDown className="w-5 h-5 mr-2" />
                    Depositar
                  </Button>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="levantamento">
              <Card className="p-6 shadow-soft rounded-2xl">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="valor-levantamento">Valor (Kzs)</Label>
                    <Input
                      id="valor-levantamento"
                      type="number"
                      value={valor}
                      onChange={(e) => setValor(e.target.value)}
                      placeholder="0.00"
                      className="rounded-xl mt-2"
                    />
                  </div>
                  <Button
                    onClick={handleLevantamento}
                    className="w-full bg-gradient-primary hover:opacity-90 text-white rounded-xl h-12 font-semibold"
                  >
                    <ArrowUp className="w-5 h-5 mr-2" />
                    Levantar
                  </Button>
                </div>
              </Card>
            </TabsContent>
          </Tabs>

          <Card className="p-6 shadow-soft rounded-2xl">
            <h2 className="text-lg font-bold mb-4 text-foreground">Histórico</h2>
            <div className="space-y-3">
              {transacoes.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma transação ainda
                </p>
              ) : (
                transacoes.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      {t.tipo === "deposito" ? (
                        <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                          <ArrowDown className="w-5 h-5 text-success" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                          <ArrowUp className="w-5 h-5 text-warning" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-foreground">{t.descricao}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(t.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-bold ${
                          t.tipo === "deposito" ? "text-success" : "text-warning"
                        }`}
                      >
                        {t.tipo === "deposito" ? "+" : "-"}
                        {Number(t.valor).toFixed(2)} Kzs
                      </p>
                      <p className="text-xs text-muted-foreground">{t.status}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
      <BottomNav />
    </AuthGuard>
  );
}
