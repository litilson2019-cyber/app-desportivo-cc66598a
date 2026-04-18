import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatKz } from "@/lib/formatKz";
import { toast } from "sonner";
import { Crown, Check, Loader2, Calendar } from "lucide-react";
import { useUserPlano } from "@/hooks/useUserPlano";
import { useNavigate } from "react-router-dom";

interface Plano {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  duracao_dias: number;
  beneficios: any;
  ordem: number;
}

export default function Planos() {
  const navigate = useNavigate();
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [saldo, setSaldo] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const { plano: planoAtivo, reload } = useUserPlano();

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const [{ data: planosData }, profileRes] = await Promise.all([
      supabase.from("planos_carteira").select("*").eq("ativo", true).order("ordem", { ascending: true }),
      user ? supabase.from("profiles").select("saldo").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null } as any),
    ]);
    setPlanos((planosData as Plano[]) || []);
    setSaldo(Number(profileRes.data?.saldo || 0));
    setLoading(false);
  };

  const ativarPlano = async (plano: Plano) => {
    if (saldo < plano.preco) {
      toast.error("Saldo insuficiente na carteira", {
        description: `Necessário ${formatKz(plano.preco)}. Faz um depósito primeiro.`,
        action: { label: "Depositar", onClick: () => navigate("/fundos") },
      });
      return;
    }
    setActivatingId(plano.id);
    const { data, error } = await supabase.rpc("ativar_plano", { _plano_id: plano.id });
    setActivatingId(null);
    if (error) {
      toast.error("Erro ao ativar plano", { description: error.message });
      return;
    }
    const result = data as any;
    if (!result?.success) {
      toast.error(result?.error || "Não foi possível ativar o plano");
      return;
    }
    toast.success(`Plano ${plano.nome} ativado!`);
    load();
    reload();
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-subtle pb-20 p-4">
        <div className="max-w-2xl mx-auto pt-6 space-y-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Crown className="w-7 h-7 text-amber-500" /> Planos
            </h1>
            <p className="text-sm text-muted-foreground">Ative um plano com o saldo da sua carteira</p>
          </div>

          <Card className="p-4 rounded-2xl shadow-soft bg-gradient-primary text-primary-foreground">
            <p className="text-xs opacity-90">Saldo da carteira</p>
            <p className="text-2xl font-bold">{formatKz(saldo)}</p>
          </Card>

          {planoAtivo && (
            <Card className="p-4 rounded-2xl border-green-500/40 bg-green-500/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-500" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{planoAtivo.plano?.nome} — Ativo</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Expira em {new Date(planoAtivo.expira_em).toLocaleDateString("pt-PT")}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : planos.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground rounded-2xl">
              Nenhum plano disponível no momento.
            </Card>
          ) : (
            <div className="space-y-3">
              {planos.map((plano) => {
                const isCurrent = planoAtivo?.plano_id === plano.id;
                const beneficios: string[] = Array.isArray(plano.beneficios?.lista) ? plano.beneficios.lista : [];
                return (
                  <Card key={plano.id} className="p-5 rounded-2xl shadow-soft">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-xl font-bold">{plano.nome}</h3>
                        {plano.descricao && <p className="text-sm text-muted-foreground">{plano.descricao}</p>}
                      </div>
                      {isCurrent && <Badge className="bg-green-500">Ativo</Badge>}
                    </div>
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-3xl font-bold text-primary">{formatKz(plano.preco)}</span>
                      <span className="text-sm text-muted-foreground">/ {plano.duracao_dias} dias</span>
                    </div>
                    {beneficios.length > 0 && (
                      <ul className="space-y-1 mb-4">
                        {beneficios.map((b, i) => (
                          <li key={i} className="text-sm flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-500 shrink-0" /> {b}
                          </li>
                        ))}
                      </ul>
                    )}
                    <Button
                      className="w-full h-11 rounded-xl"
                      onClick={() => ativarPlano(plano)}
                      disabled={activatingId === plano.id || isCurrent}
                    >
                      {activatingId === plano.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isCurrent ? (
                        "Plano atual"
                      ) : (
                        `Ativar por ${formatKz(plano.preco)}`
                      )}
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </AuthGuard>
  );
}
