import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, BadgeCheck, Crown, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { formatKz } from "@/lib/formatKz";

export default function PlanosComerciais() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [planos, setPlanos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loja, setLoja] = useState<any>(null);
  const [subscricaoAtiva, setSubscricaoAtiva] = useState<any>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: planosData }, { data: lojaData }] = await Promise.all([
        supabase.from("planos_comerciais").select("*").eq("ativo", true).order("preco_mensal"),
        supabase.from("lojas").select("*").eq("user_id", user.id).maybeSingle(),
      ]);

      setPlanos(planosData || []);
      setLoja(lojaData);

      if (lojaData) {
        const { data: sub } = await supabase
          .from("subscricoes_loja")
          .select("*, planos_comerciais(*)")
          .eq("loja_id", lojaData.id)
          .eq("ativo", true)
          .maybeSingle();
        setSubscricaoAtiva(sub);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSubscribe = async (planoId: string, tipo: "mensal" | "anual") => {
    if (!loja) {
      toast({ title: "Crie uma loja primeiro", description: "Vá ao Menu > Minha Loja para criar a sua loja.", variant: "destructive" });
      return;
    }
    try {
      const dataFim = new Date();
      if (tipo === "mensal") dataFim.setMonth(dataFim.getMonth() + 1);
      else dataFim.setFullYear(dataFim.getFullYear() + 1);

      const { error } = await supabase.from("subscricoes_loja").insert({
        loja_id: loja.id,
        plano_id: planoId,
        tipo,
        data_fim: dataFim.toISOString(),
      });
      if (error) throw error;

      // Find if plan has verified badge
      const plano = planos.find(p => p.id === planoId);
      if (plano?.selo_verificado) {
        await supabase.from("lojas").update({ verificado: true }).eq("id", loja.id);
      }

      toast({ title: "Plano ativado!", description: `Subscrição ${tipo} ativada com sucesso.` });
      loadData();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (<AuthGuard><div className="min-h-screen bg-gradient-subtle flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div><BottomNav /></AuthGuard>);
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-subtle pb-20 p-4">
        <div className="max-w-2xl mx-auto pt-6 space-y-6">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Planos Comerciais</h1>
            <p className="text-muted-foreground text-sm">Destaque a sua loja na vitrine</p>
          </div>

          {subscricaoAtiva && (
            <Card className="p-4 shadow-soft rounded-xl bg-primary/5 border-primary/20">
              <div className="flex items-center gap-2 mb-1">
                <BadgeCheck className="w-5 h-5 text-primary" />
                <span className="font-bold text-foreground text-sm">Plano Ativo</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {subscricaoAtiva.planos_comerciais?.nome} · {subscricaoAtiva.tipo === "anual" ? "Anual" : "Mensal"} · Até {new Date(subscricaoAtiva.data_fim).toLocaleDateString("pt-PT")}
              </p>
            </Card>
          )}

          {planos.length === 0 ? (
            <Card className="p-6 shadow-soft rounded-xl text-center">
              <p className="text-muted-foreground">Nenhum plano disponível de momento</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {planos.map((p) => (
                <Card key={p.id} className={`p-5 shadow-soft rounded-xl space-y-3 ${p.selo_verificado ? "border-primary/30 bg-primary/5" : ""}`}>
                  <div className="flex items-center gap-2">
                    {p.selo_verificado ? <Crown className="w-5 h-5 text-primary" /> : null}
                    <h3 className="font-bold text-foreground text-lg">{p.nome}</h3>
                  </div>
                  {p.descricao && <p className="text-sm text-muted-foreground">{p.descricao}</p>}
                  {p.selo_verificado && (
                    <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                      <BadgeCheck className="w-4 h-4" /> Inclui selo Parceiro Verificado
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Mensal</p>
                      <p className="text-lg font-bold text-foreground">{formatKz(p.preco_mensal)}</p>
                      <Button size="sm" className="w-full mt-2 rounded-xl" onClick={() => handleSubscribe(p.id, "mensal")} disabled={!!subscricaoAtiva}>
                        Subscrever
                      </Button>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Anual</p>
                      <p className="text-lg font-bold text-foreground">{formatKz(p.preco_anual)}</p>
                      <Button size="sm" className="w-full mt-2 rounded-xl" variant={p.selo_verificado ? "default" : "outline"} onClick={() => handleSubscribe(p.id, "anual")} disabled={!!subscricaoAtiva}>
                        Subscrever
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </AuthGuard>
  );
}
