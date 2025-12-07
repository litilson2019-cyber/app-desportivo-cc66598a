import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, Loader2, Upload, Eye, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

interface ResumoGastos {
  modoRisco: number;
  modoSeguro: number;
  total: number;
}

export default function Fundos() {
  const [saldo, setSaldo] = useState(0);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [valor, setValor] = useState("");
  const [banco, setBanco] = useState("");
  const [comprovativo, setComprovativo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [resumo, setResumo] = useState<ResumoGastos>({ modoRisco: 0, modoSeguro: 0, total: 0 });
  const [activeSection, setActiveSection] = useState<"deposito" | "historicos" | "resumo" | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [showAllDeposits, setShowAllDeposits] = useState(false);
  const { toast } = useToast();

  const depositosVisiveis = showAllDeposits ? transacoes : transacoes.slice(0, 5);

  const bancoIBANs: Record<string, string> = {
    "BFA": "AO06 0055 0000 1234 5678 9012 3",
    "BIC": "AO06 0040 0000 1234 5678 9012 3",
    "BAI": "AO06 0010 0000 1234 5678 9012 3",
    "ATLANTICO": "AO06 0050 0000 1234 5678 9012 3",
    "Multicaixa Express": "923 456 789"
  };

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
            console.log('Perfil atualizado:', payload);
            const newProfile = payload.new as { saldo: number };
            setSaldo(Number(newProfile.saldo));
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(transacoesChannel);
        supabase.removeChannel(profileChannel);
      };
    };

    const cleanup = setupRealtime();
    
    return () => {
      cleanup.then(fn => fn?.());
    };
  }, [toast]);

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
        .eq("tipo", "deposito")
        .order("created_at", { ascending: false });

      setTransacoes(transacoesData || []);

      // Carregar resumo de gastos
      const { data: bilhetesData } = await supabase
        .from("bilhetes")
        .select("modo")
        .eq("user_id", user.id);

      if (bilhetesData) {
        const modoRisco = bilhetesData.filter(b => b.modo === "risco").length;
        const modoSeguro = bilhetesData.filter(b => b.modo === "seguro").length;
        setResumo({
          modoRisco,
          modoSeguro,
          total: modoRisco + modoSeguro,
        });
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
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "O comprovativo deve ter no máximo 5MB.",
          variant: "destructive",
        });
        return;
      }
      setComprovativo(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
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
        title: "Selecione um banco",
        description: "Por favor, selecione o banco do depósito.",
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

      setValor("");
      setBanco("");
      setComprovativo(null);
      setPreviewUrl(null);
      loadData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
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

          <Card className="p-6 bg-gradient-primary shadow-strong rounded-2xl">
            <div className="flex items-center gap-3 mb-2">
              <Wallet className="w-6 h-6 text-white" />
              <span className="text-white/90 text-sm font-medium">Saldo Disponível</span>
            </div>
            <p className="text-4xl font-bold text-white">
              {saldo.toFixed(2)} <span className="text-xl">Kzs</span>
            </p>
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
                                    {t.valor.toFixed(2)} Kz
                                  </TableCell>
                                  <TableCell>
                                    <span
                                      className={`text-xs font-medium px-2 py-1 rounded ${
                                        t.status === "aprovado"
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
                  <Label htmlFor="banco">Banco</Label>
                  <Select value={banco} onValueChange={setBanco}>
                    <SelectTrigger className="rounded-xl mt-1.5">
                      <SelectValue placeholder="Selecione o banco" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BFA">BFA</SelectItem>
                      <SelectItem value="BIC">BIC</SelectItem>
                      <SelectItem value="BAI">BAI</SelectItem>
                      <SelectItem value="ATLANTICO">ATLANTICO</SelectItem>
                      <SelectItem value="Multicaixa Express">Multicaixa Express</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {banco && (
                  <div className="p-3 bg-muted/50 rounded-xl border border-border">
                    <Label className="text-xs text-muted-foreground">
                      {banco === "Multicaixa Express" ? "Número Express" : "IBAN"}
                    </Label>
                    <p className="font-mono font-semibold text-foreground mt-1">
                      {bancoIBANs[banco]}
                    </p>
                  </div>
                )}

                <div>
                  <Label htmlFor="valor-deposito">Valor (Kzs)</Label>
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
                    accept="image/*,.pdf"
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
                            <p className="font-medium text-foreground text-sm">{t.valor.toFixed(2)} Kzs</p>
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
                            <p className="font-medium text-foreground text-sm">{t.valor.toFixed(2)} Kzs</p>
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
                            <p className="font-medium text-foreground text-sm">{t.valor.toFixed(2)} Kzs</p>
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
            </Card>
          )}

          {/* Módulo Resumo */}
          {activeSection === "resumo" && (
            <Card className="p-5 shadow-soft rounded-xl">
              <h2 className="text-lg font-bold mb-4 text-foreground">Resumo de Gastos</h2>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-destructive/10 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-destructive" />
                    </div>
                    <span className="font-medium text-foreground text-sm">Modo Arriscado</span>
                  </div>
                  <span className="font-bold text-foreground text-sm">{resumo.modoRisco} bilhetes</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-success/10 flex items-center justify-center">
                      <TrendingDown className="w-4 h-4 text-success" />
                    </div>
                    <span className="font-medium text-foreground text-sm">Modo Seguro</span>
                  </div>
                  <span className="font-bold text-foreground text-sm">{resumo.modoSeguro} bilhetes</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-primary/10 rounded-lg border border-primary/20">
                  <span className="font-bold text-foreground text-sm">Total Geral</span>
                  <span className="font-bold text-primary text-sm">{resumo.total} bilhetes</span>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
      <BottomNav />
    </AuthGuard>
  );
}
