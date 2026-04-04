import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Link2, MousePointerClick, TrendingUp, Wallet, ArrowLeft, Copy, Check } from "lucide-react";
import { formatKz } from "@/lib/formatKz";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface DivulgacaoLink {
  id: string;
  tipo: string;
  item_id: string;
  codigo: string;
  comissao_percentual: number;
  cliques: number;
  conversoes: number;
  ativo: boolean;
  created_at: string;
}

interface Comissao {
  id: string;
  valor: number;
  status: string;
  item_tipo: string | null;
  descricao: string | null;
  created_at: string;
}

export default function MinhasDivulgacoes() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [links, setLinks] = useState<DivulgacaoLink[]>([]);
  const [comissoes, setComissoes] = useState<Comissao[]>([]);
  const [bonusBalance, setBonusBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"links" | "comissoes">("links");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [linksRes, comissoesRes, profileRes] = await Promise.all([
        supabase.from("divulgacao_links").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("divulgacao_comissoes").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("profiles").select("wallet_bonus_balance").eq("id", user.id).single(),
      ]);

      setLinks(linksRes.data || []);
      setComissoes(comissoesRes.data || []);
      setBonusBalance(profileRes.data?.wallet_bonus_balance || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalCliques = links.reduce((s, l) => s + l.cliques, 0);
  const totalConversoes = links.reduce((s, l) => s + l.conversoes, 0);
  const totalGanho = comissoes.filter(c => c.status === "pago").reduce((s, c) => s + c.valor, 0);
  const pendente = comissoes.filter(c => c.status === "pendente").reduce((s, c) => s + c.valor, 0);

  const copyLink = async (codigo: string, id: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}/r/${codigo}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Link copiado!" });
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-subtle pb-20 p-4">
        <div className="max-w-2xl mx-auto pt-6 space-y-5">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Minhas Divulgações</h1>
              <p className="text-sm text-muted-foreground">Acompanhe os seus links e comissões</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MousePointerClick className="w-4 h-4" />
                <span className="text-[10px] font-medium">Total Cliques</span>
              </div>
              <p className="text-xl font-bold text-foreground">{totalCliques}</p>
            </Card>
            <Card className="p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <TrendingUp className="w-4 h-4" />
                <span className="text-[10px] font-medium">Conversões</span>
              </div>
              <p className="text-xl font-bold text-foreground">{totalConversoes}</p>
            </Card>
            <Card className="p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Wallet className="w-4 h-4" />
                <span className="text-[10px] font-medium">Saldo Bónus</span>
              </div>
              <p className="text-xl font-bold text-primary">{formatKz(bonusBalance)}</p>
            </Card>
            <Card className="p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <TrendingUp className="w-4 h-4" />
                <span className="text-[10px] font-medium">Pendente</span>
              </div>
              <p className="text-xl font-bold text-amber-500">{formatKz(pendente)}</p>
            </Card>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <Button
              variant={tab === "links" ? "default" : "outline"}
              size="sm"
              onClick={() => setTab("links")}
              className="flex-1 gap-1.5"
            >
              <Link2 className="w-3.5 h-3.5" />
              Links ({links.length})
            </Button>
            <Button
              variant={tab === "comissoes" ? "default" : "outline"}
              size="sm"
              onClick={() => setTab("comissoes")}
              className="flex-1 gap-1.5"
            >
              <Wallet className="w-3.5 h-3.5" />
              Comissões ({comissoes.length})
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : tab === "links" ? (
            <div className="space-y-3">
              {links.length === 0 ? (
                <Card className="p-6 text-center">
                  <Link2 className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Ainda não criou nenhum link de divulgação</p>
                  <p className="text-xs text-muted-foreground mt-1">Vá à Vitrine ou Mercado e clique em "Divulgar"</p>
                </Card>
              ) : (
                links.map((link) => (
                  <Card key={link.id} className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant={link.ativo ? "default" : "secondary"} className="text-[10px]">
                        {link.tipo === "produto" ? "Produto" : link.tipo === "loja" ? "Loja" : "Anúncio"}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(link.created_at).toLocaleDateString("pt-AO")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-muted rounded-md px-2 py-1.5 text-xs truncate">
                        {window.location.origin}/r/{link.codigo}
                      </div>
                      <button
                        onClick={() => copyLink(link.codigo, link.id)}
                        className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center hover:bg-primary/20"
                      >
                        {copiedId === link.id ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5 text-primary" />}
                      </button>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MousePointerClick className="w-3 h-3" /> {link.cliques} cliques
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> {link.conversoes} conversões
                      </span>
                      <span className="text-primary font-semibold">{link.comissao_percentual}%</span>
                    </div>
                  </Card>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {comissoes.length === 0 ? (
                <Card className="p-6 text-center">
                  <Wallet className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Sem comissões registadas</p>
                </Card>
              ) : (
                comissoes.map((c) => (
                  <Card key={c.id} className="p-3 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-foreground">{formatKz(c.valor)}</p>
                      {c.descricao && <p className="text-xs text-muted-foreground">{c.descricao}</p>}
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString("pt-AO")}
                      </p>
                    </div>
                    <Badge
                      variant={c.status === "pago" ? "default" : c.status === "pendente" ? "secondary" : "destructive"}
                      className="text-[10px]"
                    >
                      {c.status === "pago" ? "Pago" : c.status === "pendente" ? "Pendente" : "Cancelado"}
                    </Badge>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </AuthGuard>
  );
}
