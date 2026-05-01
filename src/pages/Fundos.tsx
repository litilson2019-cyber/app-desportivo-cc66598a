import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, Loader2, Upload, Eye, TrendingUp, TrendingDown, Clock, ChevronDown, ChevronUp, AlertTriangle, Gift, Plus, Minus, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GastosBilhetesChart } from "@/components/GastosBilhetesChart";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useSystemConfig } from "@/hooks/useSystemConfig";

interface Transacao {
  id: string;
  tipo: string;
  valor: number;
  status: string;
  descricao: string;
  created_at: string;
  banco?: string;
  comprovativo_url?: string;
  motivo_rejeicao?: string;
}

interface AjusteSaldo {
  id: string;
  valor: number;
  tipo: string;
  motivo: string | null;
  saldo_anterior: number;
  saldo_novo: number;
  created_at: string;
}

interface Bilhete {
  id: string;
  modo: string | null;
  created_at: string;
}

interface UserPlanoHist {
  id: string;
  plano_id: string;
  preco_pago: number;
  ativado_em: string;
  expira_em: string;
  ativo: boolean;
  plano: { nome: string; duracao_dias: number } | null;
}

interface ResumoGastos {
  modoRisco: number;
  modoSeguro: number;
  total: number;
  gastoRisco: number;
  gastoSeguro: number;
  gastoTotal: number;
}

import { formatKz } from '@/lib/formatKz';

export default function Fundos() {
  const [saldo, setSaldo] = useState(0);
  const [bonusSaldo, setBonusSaldo] = useState(0);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [ajustes, setAjustes] = useState<AjusteSaldo[]>([]);
  const [planosHist, setPlanosHist] = useState<UserPlanoHist[]>([]);
  const [valor, setValor] = useState("");
  const [banco, setBanco] = useState("");
  const [comprovativo, setComprovativo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [resumo, setResumo] = useState<ResumoGastos>({ modoRisco: 0, modoSeguro: 0, total: 0, gastoRisco: 0, gastoSeguro: 0, gastoTotal: 0 });
  const [bilhetes, setBilhetes] = useState<Bilhete[]>([]);
  const [activeSection, setActiveSection] = useState<"deposito" | "historicos" | "resumo" | null>(null);
  const [historyTab, setHistoryTab] = useState<"depositos" | "bonus" | "planos">("depositos");
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [showAllDeposits, setShowAllDeposits] = useState(false);
  const [avisoAberto, setAvisoAberto] = useState(false);
  const { toast } = useToast();

  // Hook para buscar configurações do sistema (preços e métodos de depósito)
  const { config, metodosDeposito, loading: configLoading } = useSystemConfig();

  const depositosVisiveis = showAllDeposits ? transacoes : transacoes.slice(0, 5);

  // Método selecionado para mostrar dados de pagamento
  const metodoSelecionado = metodosDeposito.find((m) => m.nome === banco);

  useEffect(() => {
    loadData();

    // Setup realtime subscription para atualizações em tempo real
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Subscrição para transações
      const transacoesChannel = supabase
        .channel('transacoes-user')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'transacoes',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Transação atualizada:', payload);
            loadData(); // Recarregar dados quando houver mudança

            // Notificar o usuário sobre mudança de status
            if (payload.eventType === 'UPDATE') {
              const newData = payload.new as Transacao;
              if (newData.status === 'aprovado') {
                toast({
                  title: "✅ Depósito Aprovado!",
                  description: `Seu depósito de ${Number(newData.valor).toLocaleString()} Kz foi aprovado e creditado na sua conta.`,
                });
              } else if (newData.status === 'rejeitado') {
                toast({
                  title: "❌ Depósito Rejeitado",
                  description: newData.motivo_rejeicao || "Seu depósito foi rejeitado. Verifique o motivo no histórico.",
                  variant: "destructive"
                });
              }
            }
          }
        )
        .subscribe();

      // Subscrição para perfil (saldo)
      const profileChannel = supabase
        .channel('profile-user')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`
          },
          (payload) => {
            const newProfile = payload.new as { saldo: number; wallet_bonus_balance: number };
            setSaldo(Number(newProfile.saldo));
            setBonusSaldo(Number(newProfile.wallet_bonus_balance || 0));
          }
        )
        .subscribe();

      // Subscrição para ajustes de saldo (bónus)
      const ajustesChannel = supabase
        .channel('ajustes-user')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'ajustes_saldo',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Ajuste de saldo recebido:', payload);
            loadData();
            const newAjuste = payload.new as AjusteSaldo;
            if (newAjuste.tipo === 'adicionar') {
              toast({
                title: "🎁 Bónus Creditado!",
                description: `Foi creditado ${Number(newAjuste.valor).toLocaleString()} Kz na sua conta. ${newAjuste.motivo || ''}`,
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(transacoesChannel);
        supabase.removeChannel(profileChannel);
        supabase.removeChannel(ajustesChannel);
      };
    };

    const cleanup = setupRealtime();

    return () => {
      cleanup.then(fn => fn?.());
    };
  }, [toast]);

  // Recalcular resumo quando config ou bilhetes mudarem
  useEffect(() => {
    if (bilhetes.length > 0 && !configLoading) {
      const normalizarModo = (m: string | null) => (m ?? "").trim().toLowerCase();
      const isSeguro = (m: string | null) => normalizarModo(m) === "seguro";

      const modoSeguro = bilhetes.filter((b) => isSeguro(b.modo)).length;
      const modoRisco = bilhetes.length - modoSeguro;

      const gastoRisco = modoRisco * config.preco_modo_arriscado;
      const gastoSeguro = modoSeguro * config.preco_modo_seguro;

      setResumo({
        modoRisco,
        modoSeguro,
        total: modoRisco + modoSeguro,
        gastoRisco,
        gastoSeguro,
        gastoTotal: gastoRisco + gastoSeguro,
      });
    }
  }, [bilhetes, config, configLoading]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("saldo, wallet_bonus_balance")
        .eq("id", user.id)
        .single();

      if (profile) {
        setSaldo(Number(profile.saldo));
        setBonusSaldo(Number(profile.wallet_bonus_balance || 0));
      }

      const { data: transacoesData } = await supabase
        .from("transacoes")
        .select("*")
        .eq("user_id", user.id)
        .eq("tipo", "deposito")
        .order("created_at", { ascending: false });

      setTransacoes(transacoesData || []);

      // Carregar ajustes de saldo (bónus)
      const { data: ajustesData } = await supabase
        .from("ajustes_saldo")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setAjustes(ajustesData || []);

      // Carregar histórico de planos ativados
      const { data: planosData } = await supabase
        .from("user_planos")
        .select("id, plano_id, preco_pago, ativado_em, expira_em, ativo, plano:planos_carteira(nome, duracao_dias)")
        .eq("user_id", user.id)
        .order("ativado_em", { ascending: false });
      setPlanosHist((planosData as any) || []);

      // Carregar bilhetes
      const { data: bilhetesData } = await supabase
        .from("bilhetes")
        .select("id, modo, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (bilhetesData) {
        setBilhetes(bilhetesData);
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados.",
        variant: "destructive",
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Formato inválido",
          description: "Envie apenas JPG, PNG ou PDF.",
          variant: "destructive",
        });
        e.target.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "O comprovativo deve ter no máximo 5MB.",
          variant: "destructive",
        });
        e.target.value = '';
        return;
      }
      setComprovativo(file);
      try {
        const url = URL.createObjectURL(file);
        setPreviewUrl(file.type === 'application/pdf' ? null : url);
      } catch {
        setPreviewUrl(null);
      }
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

    if (!banco) {
      toast({
        title: "Selecione um método",
        description: "Por favor, selecione o método de depósito.",
        variant: "destructive",
      });
      return;
    }

    if (!comprovativo) {
      toast({
        title: "Comprovativo obrigatório",
        description: "Por favor, faça upload do comprovativo de pagamento.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Upload do comprovativo (usando user.id como pasta para RLS)
      const fileExt = comprovativo.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("comprovativos")
        .upload(fileName, comprovativo);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("comprovativos")
        .getPublicUrl(fileName);

      // Criar transação pendente
      await supabase.from("transacoes").insert({
        user_id: user.id,
        tipo: "deposito",
        valor: Number(valor),
        status: "pendente",
        descricao: `Depósito via ${banco}`,
        banco: banco,
        comprovativo_url: publicUrl,
      });

      toast({
        title: "Depósito solicitado!",
        description: "Sua solicitação está em análise.",
      });



      const sendSMS = async () => {
        try {
          const response = await fetch("https://api.useombala.ao/v1/messages", {
            method: "POST",
            headers: {
              "Authorization": "Token ad4752fa-ecdf-4c79-ab9b-c26604e75b6e",
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              message: "Ha Deposito solicitado!, usuario: " + user.email + " com valor de: " + valor + " kz" + " banco: " + banco,
              from: "NEXA VISUAL",
              to: "926566505"
            })
          });

          const data = await response.json();

          if (!response.ok) {
            console.error("Error send sms", data)
            return;
          }

          console.log("Sucesso on send sms:", data);

        } catch (error) {
          console.error("Erro de conexão:", error);
        }
      };


      setValor("");
      setBanco("");
      setComprovativo(null);
      setPreviewUrl(null);
      loadData();
      sendSMS();
    } catch (error: any) {
      console.error('Erro no depósito:', error);
      toast({
        title: "Erro ao enviar depósito",
        description: error?.message || "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const transacoesPendentes = transacoes.filter(t => t.status === "pendente");
  const transacoesAprovadas = transacoes.filter(t => t.status === "aprovado");
  const transacoesRejeitadas = transacoes.filter(t => t.status === "rejeitado");

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-subtle pb-20 p-4">
        <div className="max-w-2xl mx-auto pt-6 space-y-6">
          <h1 className="text-3xl font-bold text-foreground">Fundos</h1>

          {/* Aviso de Saldo Interno Recolhível */}
          <Collapsible open={avisoAberto} onOpenChange={setAvisoAberto}>
            <Card className="bg-amber-500/10 border-amber-500/30 rounded-xl overflow-hidden">
              <CollapsibleTrigger className="w-full p-2 flex items-center justify-center gap-2 hover:bg-amber-500/5 transition-colors">
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                <span className="text-xs text-amber-300 font-medium">Aviso Importante</span>
                {avisoAberto ? (
                  <ChevronUp className="w-3 h-3 text-amber-400" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-amber-400" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-3 pb-3">
                  <p className="text-xs text-amber-300/80 text-center">
                    Este aplicativo não possui planos nem permite levantamentos. Todo o saldo, incluindo bónus, é apenas para uso interno.
                  </p>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          <Card className="p-6 bg-gradient-primary shadow-strong rounded-2xl">
            <div className="flex items-center gap-3 mb-2">
              <Wallet className="w-6 h-6 text-white" />
              <span className="text-white/90 text-sm font-medium">Saldo de Uso Interno</span>
            </div>
            <p className="text-4xl font-bold text-white">
              {formatKz(saldo)}
            </p>
            {bonusSaldo > 0 && (
              <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-white/80" />
                  <span className="text-white/80 text-xs">Saldo Bónus (Divulgação)</span>
                </div>
                <span className="text-white font-bold text-sm">{formatKz(bonusSaldo)}</span>
              </div>
            )}
            <p className="text-xs text-white/60 mt-2">Saldo não sacável – apenas para uso interno</p>
          </Card>

          {/* Botões de Navegação */}
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant={activeSection === "deposito" ? "default" : "outline"}
              onClick={() => setActiveSection(activeSection === "deposito" ? null : "deposito")}
              className="rounded-xl h-11"
            >
              Depósito
            </Button>
            <Button
              variant={activeSection === "historicos" ? "default" : "outline"}
              onClick={() => setActiveSection(activeSection === "historicos" ? null : "historicos")}
              className="rounded-xl h-11"
            >
              Históricos
            </Button>
            <Button
              variant={activeSection === "resumo" ? "default" : "outline"}
              onClick={() => setActiveSection(activeSection === "resumo" ? null : "resumo")}
              className="rounded-xl h-11"
            >
              Resumo
            </Button>
          </div>

          {/* Módulo Depósito */}
          {activeSection === "deposito" && (
            <Card className="p-5 shadow-soft rounded-xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-foreground">Depósito</h2>
                <Dialog open={statusDialogOpen} onOpenChange={(open) => {
                  setStatusDialogOpen(open);
                  if (!open) setShowAllDeposits(false);
                }}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full h-9 w-9"
                    >
                      <Clock className="w-5 h-5 text-muted-foreground" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Status de Depósitos</DialogTitle>
                    </DialogHeader>
                    <div className="mt-4">
                      {transacoes.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          Nenhum depósito enviado ainda.
                        </p>
                      ) : (
                        <>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Valor (Kz)</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Observações</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {depositosVisiveis.map((t) => (
                                <TableRow key={t.id}>
                                  <TableCell className="text-sm">
                                    {new Date(t.created_at).toLocaleDateString("pt-PT", {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                    })}
                                  </TableCell>
                                  <TableCell className="text-sm font-medium">
                                    {formatKz(t.valor)}
                                  </TableCell>
                                  <TableCell>
                                    <span
                                      className={`text-xs font-medium px-2 py-1 rounded ${t.status === "aprovado"
                                        ? "bg-success/20 text-success"
                                        : t.status === "rejeitado"
                                          ? "bg-destructive/20 text-destructive"
                                          : "bg-warning/20 text-warning"
                                        }`}
                                    >
                                      {t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {t.status === "rejeitado" && t.motivo_rejeicao
                                      ? t.motivo_rejeicao
                                      : t.banco || "-"}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          {transacoes.length > 5 && !showAllDeposits && (
                            <Button
                              variant="outline"
                              className="w-full mt-4 rounded-xl"
                              onClick={() => setShowAllDeposits(true)}
                            >
                              Ver mais ({transacoes.length - 5} restantes)
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="banco">Método de Pagamento</Label>
                  <Select value={banco} onValueChange={setBanco}>
                    <SelectTrigger className="rounded-xl mt-1.5">
                      <SelectValue placeholder="Selecione o método" />
                    </SelectTrigger>
                    <SelectContent>
                      {configLoading ? (
                        <SelectItem value="__loading__" disabled>Carregando...</SelectItem>
                      ) : metodosDeposito.length === 0 ? (
                        <SelectItem value="__none__" disabled>Nenhum método disponível</SelectItem>
                      ) : (
                        metodosDeposito
                          .filter((metodo) => metodo.nome && metodo.nome.trim() !== "")
                          .map((metodo) => (
                            <SelectItem key={metodo.id} value={metodo.nome}>
                              {metodo.nome}
                            </SelectItem>
                          ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {metodoSelecionado && (
                  <div className="p-3 bg-muted/50 rounded-xl border border-border">
                    {metodoSelecionado.titular_conta && (
                      <div className="mb-2">
                        <Label className="text-xs text-muted-foreground">Titular</Label>
                        <p className="font-semibold text-foreground text-sm">
                          {metodoSelecionado.titular_conta}
                        </p>
                      </div>
                    )}
                    <Label className="text-xs text-muted-foreground">
                      {metodoSelecionado.tipo === "express" ? "Número Express" : "IBAN"}
                    </Label>
                    <p className="font-mono font-semibold text-foreground mt-1">
                      {metodoSelecionado.tipo === "express"
                        ? metodoSelecionado.numero_express
                        : metodoSelecionado.iban}
                    </p>
                  </div>
                )}

                <div>
                  <Label htmlFor="valor-deposito">Valor (Kz)</Label>
                  <Input
                    id="valor-deposito"
                    type="number"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    placeholder="0.00"
                    className="rounded-xl mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="comprovativo">Comprovativo de Pagamento</Label>
                  <Input
                    id="comprovativo"
                    type="file"
                    accept="image/jpeg,image/png,application/pdf"
                    onChange={handleFileChange}
                    className="rounded-xl mt-1.5"
                  />
                </div>
                {previewUrl && (
                  <div className="relative">
                    <Label>Prévia do Comprovativo</Label>
                    <div className="mt-1.5 relative rounded-xl overflow-hidden border border-border">
                      <img src={previewUrl} alt="Prévia" className="w-full h-40 object-cover" />
                      <Button
                        variant="secondary"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => window.open(previewUrl, "_blank")}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ver
                      </Button>
                    </div>
                  </div>
                )}
                <Button
                  onClick={handleDeposito}
                  disabled={uploading}
                  className="w-full bg-gradient-primary hover:opacity-90 text-white rounded-xl h-11 font-semibold"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 mr-2" />
                      Enviar Depósito
                    </>
                  )}
                </Button>
              </div>
            </Card>
          )}

          {/* Módulo Históricos */}
          {activeSection === "historicos" && (
            <Card className="p-5 shadow-soft rounded-xl">
              <h2 className="text-lg font-bold mb-4 text-foreground">Históricos</h2>

              {/* Abas de navegação */}
              <div className="flex gap-2 mb-4">
                <Button
                  variant={historyTab === "depositos" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setHistoryTab("depositos")}
                  className="flex-1"
                >
                  Depósitos
                </Button>
                <Button
                  variant={historyTab === "bonus" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setHistoryTab("bonus")}
                  className="flex-1"
                >
                  <Gift className="w-3 h-3 mr-1" />
                  Bónus
                </Button>
                <Button
                  variant={historyTab === "planos" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setHistoryTab("planos")}
                  className="flex-1"
                >
                  <Crown className="w-3 h-3 mr-1" />
                  Planos
                </Button>
              </div>

              {historyTab === "depositos" && (
                <>
                  {/* Pendentes */}
                  <div className="mb-5">
                    <h3 className="font-semibold text-warning mb-2 text-sm">Pendentes</h3>
                    <div className="space-y-2">
                      {transacoesPendentes.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-3 text-center">
                          Nenhum depósito pendente
                        </p>
                      ) : (
                        transacoesPendentes.map((t) => (
                          <div key={t.id} className="p-2.5 bg-warning/10 rounded-lg border border-warning/20">
                            <div className="flex justify-between items-start mb-1.5">
                              <div>
                                <p className="font-medium text-foreground text-sm">{formatKz(t.valor)}</p>
                                <p className="text-xs text-muted-foreground">
                                  {t.banco} • {new Date(t.created_at).toLocaleDateString("pt-PT")}
                                </p>
                              </div>
                              <span className="text-xs font-medium text-warning bg-warning/20 px-2 py-0.5 rounded">
                                {t.status}
                              </span>
                            </div>
                            {t.comprovativo_url && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full mt-1.5 h-8 text-xs"
                                onClick={() => window.open(t.comprovativo_url, "_blank")}
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                Ver Comprovativo
                              </Button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Aprovados */}
                  <div className="mb-5">
                    <h3 className="font-semibold text-success mb-2 text-sm">Aprovados</h3>
                    <div className="space-y-2">
                      {transacoesAprovadas.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-3 text-center">
                          Nenhum depósito aprovado
                        </p>
                      ) : (
                        transacoesAprovadas.map((t) => (
                          <div key={t.id} className="p-2.5 bg-success/10 rounded-lg border border-success/20">
                            <div className="flex justify-between items-start mb-1.5">
                              <div>
                                <p className="font-medium text-foreground text-sm">{formatKz(t.valor)}</p>
                                <p className="text-xs text-muted-foreground">
                                  {t.banco} • {new Date(t.created_at).toLocaleDateString("pt-PT")}
                                </p>
                              </div>
                              <span className="text-xs font-medium text-success bg-success/20 px-2 py-0.5 rounded">
                                {t.status}
                              </span>
                            </div>
                            {t.comprovativo_url && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full mt-1.5 h-8 text-xs"
                                onClick={() => window.open(t.comprovativo_url, "_blank")}
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                Ver Comprovativo
                              </Button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Rejeitados */}
                  <div>
                    <h3 className="font-semibold text-destructive mb-2 text-sm">Rejeitados</h3>
                    <div className="space-y-2">
                      {transacoesRejeitadas.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-3 text-center">
                          Nenhum depósito rejeitado
                        </p>
                      ) : (
                        transacoesRejeitadas.map((t) => (
                          <div key={t.id} className="p-2.5 bg-destructive/10 rounded-lg border border-destructive/20">
                            <div className="flex justify-between items-start mb-1.5">
                              <div>
                                <p className="font-medium text-foreground text-sm">{formatKz(t.valor)}</p>
                                <p className="text-xs text-muted-foreground">
                                  {t.banco} • {new Date(t.created_at).toLocaleDateString("pt-PT")}
                                </p>
                              </div>
                              <span className="text-xs font-medium text-destructive bg-destructive/20 px-2 py-0.5 rounded">
                                {t.status}
                              </span>
                            </div>
                            {t.motivo_rejeicao && (
                              <p className="text-xs text-destructive mt-1.5 p-2 bg-destructive/5 rounded">
                                Motivo: {t.motivo_rejeicao}
                              </p>
                            )}
                            {t.comprovativo_url && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full mt-1.5 h-8 text-xs"
                                onClick={() => window.open(t.comprovativo_url, "_blank")}
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                Ver Comprovativo
                              </Button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}

              {historyTab === "bonus" && (
                <div className="space-y-2">
                  {ajustes.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-8 text-center">
                      Nenhum bónus ou ajuste de saldo encontrado
                    </p>
                  ) : (
                    ajustes.map((a) => (
                      <div
                        key={a.id}
                        className={`p-2.5 rounded-lg border ${a.tipo === 'adicionar'
                          ? 'bg-success/10 border-success/20'
                          : 'bg-destructive/10 border-destructive/20'
                          }`}
                      >
                        <div className="flex justify-between items-start mb-1.5">
                          <div className="flex items-center gap-2">
                            {a.tipo === 'adicionar' ? (
                              <Plus className="w-4 h-4 text-success" />
                            ) : (
                              <Minus className="w-4 h-4 text-destructive" />
                            )}
                            <div>
                              <p className={`font-medium text-sm ${a.tipo === 'adicionar' ? 'text-success' : 'text-destructive'}`}>
                                {a.tipo === 'adicionar' ? '+' : '-'}{formatKz(a.valor)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(a.created_at).toLocaleDateString("pt-PT", {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${a.tipo === 'adicionar'
                            ? 'bg-success/20 text-success'
                            : 'bg-destructive/20 text-destructive'
                            }`}>
                            {a.tipo === 'adicionar' ? 'Bónus' : 'Dedução'}
                          </span>
                        </div>
                        {a.motivo && (
                          <p className="text-xs text-muted-foreground mt-1.5 p-2 bg-background/50 rounded">
                            {a.motivo}
                          </p>
                        )}
                        <div className="flex justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border/30">
                          <span>Saldo anterior: {formatKz(a.saldo_anterior)}</span>
                          <span>Novo saldo: {formatKz(a.saldo_novo)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {historyTab === "planos" && (
                <div className="space-y-2">
                  {planosHist.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-8 text-center">
                      Ainda não ativou nenhum plano
                    </p>
                  ) : (
                    <>
                      <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Total gasto em planos</span>
                        <span className="font-bold text-primary text-sm">
                          {formatKz(planosHist.reduce((s, p) => s + Number(p.preco_pago), 0))}
                        </span>
                      </div>
                      {planosHist.map((p) => {
                        const expira = new Date(p.expira_em).getTime();
                        const ativo = p.ativo && expira > Date.now();
                        return (
                          <div
                            key={p.id}
                            className={`p-2.5 rounded-lg border ${ativo ? 'bg-primary/10 border-primary/20' : 'bg-muted/30 border-border'}`}
                          >
                            <div className="flex justify-between items-start mb-1.5">
                              <div className="flex items-center gap-2">
                                <Crown className={`w-4 h-4 ${ativo ? 'text-primary' : 'text-muted-foreground'}`} />
                                <div>
                                  <p className="font-medium text-sm text-foreground">
                                    {p.plano?.nome || 'Plano'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Ativado: {new Date(p.ativado_em).toLocaleDateString("pt-PT")}
                                  </p>
                                </div>
                              </div>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded ${ativo ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                {ativo ? 'Ativo' : 'Expirado'}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border/30">
                              <span>Pago: {formatKz(p.preco_pago)}</span>
                              <span>Expira: {new Date(p.expira_em).toLocaleDateString("pt-PT")}</span>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              )}
            </Card>
          )}

          {/* Módulo Resumo */}
          {activeSection === "resumo" && (
            <>
              <Card className="p-5 shadow-soft rounded-xl">
                <h2 className="text-lg font-bold mb-4 text-foreground">Resumo de Gastos em Bilhetes</h2>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-destructive/10 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-destructive" />
                      </div>
                      <div>
                        <span className="font-medium text-foreground text-sm block">Modo Arriscado</span>
                        <span className="text-xs text-muted-foreground">{resumo.modoRisco} bilhetes × {config.preco_modo_arriscado} Kz</span>
                      </div>
                    </div>
                    <span className="font-bold text-foreground text-sm">{resumo.gastoRisco.toLocaleString()} Kz</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-success/10 flex items-center justify-center">
                        <TrendingDown className="w-4 h-4 text-success" />
                      </div>
                      <div>
                        <span className="font-medium text-foreground text-sm block">Modo Seguro</span>
                        <span className="text-xs text-muted-foreground">{resumo.modoSeguro} bilhetes × {config.preco_modo_seguro} Kz</span>
                      </div>
                    </div>
                    <span className="font-bold text-foreground text-sm">{resumo.gastoSeguro.toLocaleString()} Kz</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
                    <div>
                      <span className="font-bold text-foreground text-sm block">Total Geral</span>
                      <span className="text-xs text-muted-foreground">{resumo.total} bilhetes construídos</span>
                    </div>
                    <span className="font-bold text-primary text-lg">{resumo.gastoTotal.toLocaleString()} Kz</span>
                  </div>
                </div>
              </Card>

              {/* Gráfico de Gastos por Período */}
              <GastosBilhetesChart bilhetes={bilhetes} config={config} />
            </>
          )}
        </div>
      </div>
      <BottomNav />
    </AuthGuard>
  );
}
