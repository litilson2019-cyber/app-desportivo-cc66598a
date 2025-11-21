import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, Loader2, Upload, Eye, TrendingUp, TrendingDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const [loading, setLoading] = useState(true);
  const [valor, setValor] = useState("");
  const [banco, setBanco] = useState("");
  const [comprovativo, setComprovativo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [resumo, setResumo] = useState<ResumoGastos>({ modoRisco: 0, modoSeguro: 0, total: 0 });
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
    } finally {
      setLoading(false);
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

      // Upload do comprovativo
      const fileExt = comprovativo.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
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


  if (loading) {
    return (
      <AuthGuard>
        <div className="flex items-center justify-center min-h-screen bg-gradient-subtle">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AuthGuard>
    );
  }

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

          {/* Módulo Resumo */}
          <Card className="p-6 shadow-soft rounded-2xl">
            <h2 className="text-lg font-bold mb-4 text-foreground">Resumo de Gastos</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-destructive" />
                  </div>
                  <span className="font-medium text-foreground">Modo Arriscado</span>
                </div>
                <span className="font-bold text-foreground">{resumo.modoRisco} bilhetes</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                    <TrendingDown className="w-5 h-5 text-success" />
                  </div>
                  <span className="font-medium text-foreground">Modo Seguro</span>
                </div>
                <span className="font-bold text-foreground">{resumo.modoSeguro} bilhetes</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-primary/10 rounded-xl border border-primary/20">
                <span className="font-bold text-foreground">Total Geral</span>
                <span className="font-bold text-primary">{resumo.total} bilhetes</span>
              </div>
            </div>
          </Card>

          {/* Módulo Depósito */}
          <Card className="p-6 shadow-soft rounded-2xl">
            <h2 className="text-lg font-bold mb-4 text-foreground">Módulo Depósito</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="banco">Banco</Label>
                <Select value={banco} onValueChange={setBanco}>
                  <SelectTrigger className="rounded-xl mt-2">
                    <SelectValue placeholder="Selecione o banco" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Atlântico">Atlântico</SelectItem>
                    <SelectItem value="BFA">BFA</SelectItem>
                    <SelectItem value="BAI">BAI</SelectItem>
                    <SelectItem value="BCI">BCI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
              <div>
                <Label htmlFor="comprovativo">Comprovativo de Pagamento</Label>
                <Input
                  id="comprovativo"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="rounded-xl mt-2"
                />
              </div>
              {previewUrl && (
                <div className="relative">
                  <Label>Prévia do Comprovativo</Label>
                  <div className="mt-2 relative rounded-xl overflow-hidden border border-border">
                    <img src={previewUrl} alt="Prévia" className="w-full h-48 object-cover" />
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
                className="w-full bg-gradient-primary hover:opacity-90 text-white rounded-xl h-12 font-semibold"
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

          {/* Módulo Históricos */}
          <Card className="p-6 shadow-soft rounded-2xl">
            <h2 className="text-lg font-bold mb-4 text-foreground">Módulo Históricos</h2>
            
            {/* Pendentes */}
            <div className="mb-6">
              <h3 className="font-semibold text-warning mb-3">Pendentes</h3>
              <div className="space-y-2">
                {transacoesPendentes.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Nenhum depósito pendente
                  </p>
                ) : (
                  transacoesPendentes.map((t) => (
                    <div key={t.id} className="p-3 bg-warning/10 rounded-xl border border-warning/20">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-foreground">{t.valor.toFixed(2)} Kzs</p>
                          <p className="text-xs text-muted-foreground">
                            {t.banco} • {new Date(t.created_at).toLocaleDateString("pt-PT")}
                          </p>
                        </div>
                        <span className="text-xs font-medium text-warning bg-warning/20 px-2 py-1 rounded">
                          {t.status}
                        </span>
                      </div>
                      {t.comprovativo_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2"
                          onClick={() => window.open(t.comprovativo_url, "_blank")}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Ver Comprovativo
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Aprovados */}
            <div className="mb-6">
              <h3 className="font-semibold text-success mb-3">Aprovados</h3>
              <div className="space-y-2">
                {transacoesAprovadas.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Nenhum depósito aprovado
                  </p>
                ) : (
                  transacoesAprovadas.map((t) => (
                    <div key={t.id} className="p-3 bg-success/10 rounded-xl border border-success/20">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-foreground">{t.valor.toFixed(2)} Kzs</p>
                          <p className="text-xs text-muted-foreground">
                            {t.banco} • {new Date(t.created_at).toLocaleDateString("pt-PT")}
                          </p>
                        </div>
                        <span className="text-xs font-medium text-success bg-success/20 px-2 py-1 rounded">
                          {t.status}
                        </span>
                      </div>
                      {t.comprovativo_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2"
                          onClick={() => window.open(t.comprovativo_url, "_blank")}
                        >
                          <Eye className="w-4 h-4 mr-1" />
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
              <h3 className="font-semibold text-destructive mb-3">Rejeitados</h3>
              <div className="space-y-2">
                {transacoesRejeitadas.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Nenhum depósito rejeitado
                  </p>
                ) : (
                  transacoesRejeitadas.map((t) => (
                    <div key={t.id} className="p-3 bg-destructive/10 rounded-xl border border-destructive/20">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-foreground">{t.valor.toFixed(2)} Kzs</p>
                          <p className="text-xs text-muted-foreground">
                            {t.banco} • {new Date(t.created_at).toLocaleDateString("pt-PT")}
                          </p>
                        </div>
                        <span className="text-xs font-medium text-destructive bg-destructive/20 px-2 py-1 rounded">
                          {t.status}
                        </span>
                      </div>
                      {t.motivo_rejeicao && (
                        <p className="text-xs text-destructive mt-2 p-2 bg-destructive/5 rounded">
                          Motivo: {t.motivo_rejeicao}
                        </p>
                      )}
                      {t.comprovativo_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2"
                          onClick={() => window.open(t.comprovativo_url, "_blank")}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Ver Comprovativo
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
      <BottomNav />
    </AuthGuard>
  );
}
