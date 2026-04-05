import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Star, Zap, Eye, MousePointer, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Destaque {
  id: string;
  tipo: string;
  orcamento: number;
  gasto: number;
  preco_unitario: number;
  prioridade: number;
  data_inicio: string;
  data_fim: string;
  ativo: boolean;
}

const TIPO_CONFIG = {
  clique: { label: "Por Clique", icon: MousePointer, desc: "Paga por cada clique na sua loja", precoSugerido: 50 },
  visualizacao: { label: "Por Visualização", icon: Eye, desc: "Paga por cada visualização na vitrine", precoSugerido: 10 },
  semanal: { label: "Destaque Semanal", icon: Calendar, desc: "Posição fixa no topo por 7 dias", precoSugerido: 5000 },
};

export default function MeusDestaques() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loja, setLoja] = useState<any>(null);
  const [destaques, setDestaques] = useState<Destaque[]>([]);
  const [saldo, setSaldo] = useState(0);
  const [bonusSaldo, setBonusSaldo] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ tipo: "semanal", orcamento: "" });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load profile balance
      const { data: profile } = await supabase
        .from("profiles")
        .select("saldo, wallet_bonus_balance")
        .eq("id", user.id)
        .single();
      if (profile) {
        setSaldo(Number(profile.saldo) || 0);
        setBonusSaldo(Number(profile.wallet_bonus_balance) || 0);
      }

      // Load user's store
      const { data: lojaData } = await supabase
        .from("lojas")
        .select("id, nome")
        .eq("user_id", user.id)
        .single();

      if (!lojaData) {
        setLoading(false);
        return;
      }
      setLoja(lojaData);

      // Load highlights
      const { data: destaquesData } = await supabase
        .from("destaques_vitrine")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setDestaques((destaquesData as Destaque[]) || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCriarDestaque = async () => {
    if (!loja) return;
    const orcamento = Number(form.orcamento);
    if (orcamento <= 0) {
      toast({ title: "Insira um orçamento válido", variant: "destructive" });
      return;
    }

    const totalDisponivel = saldo + bonusSaldo;
    if (orcamento > totalDisponivel) {
      toast({ title: "Saldo insuficiente", description: `Disponível: ${totalDisponivel.toLocaleString("pt-AO")} Kz`, variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const tipo = form.tipo as keyof typeof TIPO_CONFIG;
      const precoUnit = TIPO_CONFIG[tipo].precoSugerido;
      const prioridade = Math.floor(orcamento / 100); // higher budget = higher priority

      // Calculate duration based on type
      const now = new Date();
      let dataFim: Date;
      if (tipo === "semanal") {
        dataFim = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      } else {
        // Click/view campaigns: run until budget depletes or 30 days
        dataFim = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      }

      const { error } = await supabase.from("destaques_vitrine").insert({
        loja_id: loja.id,
        user_id: user.id,
        tipo: form.tipo,
        orcamento,
        preco_unitario: precoUnit,
        prioridade,
        data_fim: dataFim.toISOString(),
      });

      if (error) throw error;

      // Deduct from bonus balance first, then main balance
      let restante = orcamento;
      if (bonusSaldo > 0) {
        const deductBonus = Math.min(bonusSaldo, restante);
        await supabase.from("profiles").update({
          wallet_bonus_balance: bonusSaldo - deductBonus,
        }).eq("id", user.id);
        restante -= deductBonus;
      }
      if (restante > 0) {
        await supabase.from("profiles").update({
          saldo: saldo - restante,
        }).eq("id", user.id);
      }

      toast({ title: "Destaque criado com sucesso!" });
      setShowDialog(false);
      setForm({ tipo: "semanal", orcamento: "" });
      loadData();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const isActive = (d: Destaque) => d.ativo && new Date(d.data_fim) > new Date() && d.gasto < d.orcamento;

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        <BottomNav />
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-subtle pb-20 p-4">
        <div className="max-w-2xl mx-auto pt-6 space-y-6">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>

          <div>
            <h1 className="text-3xl font-bold text-foreground">Meus Destaques</h1>
            <p className="text-muted-foreground text-sm">Promova a sua loja na Vitrine Oficial</p>
          </div>

          {/* Balance Card */}
          <Card className="p-4 shadow-soft rounded-xl">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Saldo Principal</p>
                <p className="text-lg font-bold text-foreground">{saldo.toLocaleString("pt-AO")} Kz</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Saldo Bónus</p>
                <p className="text-lg font-bold text-primary">{bonusSaldo.toLocaleString("pt-AO")} Kz</p>
              </div>
            </div>
          </Card>

          {!loja ? (
            <Card className="p-6 shadow-soft rounded-xl text-center space-y-3">
              <Star className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">Crie uma loja primeiro para poder destacá-la.</p>
              <Button onClick={() => navigate("/minha-loja")} className="rounded-xl">
                Criar Loja
              </Button>
            </Card>
          ) : (
            <>
              <Button onClick={() => setShowDialog(true)} className="w-full rounded-xl gap-2">
                <Zap className="w-4 h-4" /> Criar Novo Destaque
              </Button>

              {/* Highlight Types Info */}
              <div className="grid gap-3">
                {Object.entries(TIPO_CONFIG).map(([key, cfg]) => (
                  <Card key={key} className="p-3 shadow-soft rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <cfg.icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-foreground">{cfg.label}</p>
                        <p className="text-xs text-muted-foreground">{cfg.desc}</p>
                      </div>
                      <p className="text-xs font-medium text-primary">{cfg.precoSugerido.toLocaleString("pt-AO")} Kz/{key === "semanal" ? "semana" : "unid"}</p>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Active Highlights */}
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-foreground">Campanhas ({destaques.length})</h2>
                {destaques.length === 0 ? (
                  <Card className="p-6 shadow-soft rounded-xl text-center">
                    <p className="text-sm text-muted-foreground">Nenhuma campanha criada</p>
                  </Card>
                ) : (
                  destaques.map((d) => {
                    const active = isActive(d);
                    const tipo = TIPO_CONFIG[d.tipo as keyof typeof TIPO_CONFIG];
                    const progresso = d.orcamento > 0 ? Math.min((d.gasto / d.orcamento) * 100, 100) : 0;
                    return (
                      <Card key={d.id} className="p-4 shadow-soft rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {tipo && <tipo.icon className="w-4 h-4 text-primary" />}
                            <span className="font-semibold text-sm text-foreground">{tipo?.label || d.tipo}</span>
                          </div>
                          <Badge variant={active ? "default" : "secondary"} className="text-[10px]">
                            {active ? "Ativo" : "Terminado"}
                          </Badge>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Orçamento: {d.orcamento.toLocaleString("pt-AO")} Kz</span>
                          <span>Gasto: {d.gasto.toLocaleString("pt-AO")} Kz</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5">
                          <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${progresso}%` }} />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Prioridade: {d.prioridade}</span>
                          <span>Até: {new Date(d.data_fim).toLocaleDateString("pt-PT")}</span>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>
      <BottomNav />

      {/* Create Highlight Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Destaque</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Tipo de Destaque</label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semanal">Destaque Semanal (5.000 Kz/semana)</SelectItem>
                  <SelectItem value="clique">Por Clique (50 Kz/clique)</SelectItem>
                  <SelectItem value="visualizacao">Por Visualização (10 Kz/view)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Orçamento (Kz)</label>
              <Input
                type="number"
                value={form.orcamento}
                onChange={(e) => setForm({ ...form, orcamento: e.target.value })}
                placeholder={form.tipo === "semanal" ? "5000" : "1000"}
                className="rounded-xl"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Maior orçamento = maior prioridade na Vitrine
              </p>
            </div>
            <div className="bg-muted/50 p-3 rounded-xl text-xs space-y-1">
              <p className="font-medium text-foreground">Resumo:</p>
              <p className="text-muted-foreground">
                {form.tipo === "semanal"
                  ? `Duração: 7 dias no topo da Vitrine`
                  : `Duração: até 30 dias ou esgotar orçamento`}
              </p>
              <p className="text-muted-foreground">
                Prioridade estimada: {Number(form.orcamento) > 0 ? Math.floor(Number(form.orcamento) / 100) : 0}
              </p>
            </div>
            <Button onClick={handleCriarDestaque} disabled={saving || !form.orcamento} className="w-full rounded-xl gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Ativar Destaque
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AuthGuard>
  );
}
