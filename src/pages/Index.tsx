import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, Eye, TrendingUp, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Index() {
  const navigate = useNavigate();
  const [nome, setNome] = useState("Investidor");
  const [saldo, setSaldo] = useState(0);
  const [variacao, setVariacao] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("nome_completo, saldo")
        .eq("id", user.id)
        .single();

      if (profile) {
        setNome(profile.nome_completo || "Investidor");
        setSaldo(Number(profile.saldo));
        setVariacao(Math.random() * 5000);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
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
          <div>
            <h1 className="text-3xl font-bold text-foreground">Olá, {nome}!</h1>
            <p className="text-muted-foreground">Seu patrimônio está crescendo</p>
          </div>

          <Card className="p-6 bg-gradient-primary shadow-strong rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-white" />
              <span className="text-white/90 text-sm font-medium">Saldo Total</span>
            </div>
            <p className="text-4xl font-bold text-white mb-3">
              {saldo.toFixed(2)} <span className="text-xl">Kzs</span>
            </p>
            <p className="text-white/80 text-sm">
              +{variacao.toFixed(2)} Kzs hoje
            </p>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Button className="h-14 bg-card hover:bg-card/80 text-foreground shadow-soft rounded-xl font-semibold border border-border">
              <Share2 className="w-5 h-5 mr-2" />
              Compartilhar
            </Button>
            <Button 
              onClick={() => navigate("/construcao")}
              className="h-14 bg-gradient-primary hover:opacity-90 text-white shadow-soft rounded-xl font-semibold"
            >
              <Eye className="w-5 h-5 mr-2" />
              Investimentos
            </Button>
          </div>

          <div>
            <h2 className="text-lg font-bold mb-3 text-foreground">Investimentos Ativos</h2>
            <Card className="p-4 shadow-soft rounded-2xl">
              <p className="text-center text-muted-foreground py-8">
                Nenhum investimento ativo ainda
              </p>
            </Card>
          </div>
        </div>
      </div>
      <BottomNav />
    </AuthGuard>
  );
}
