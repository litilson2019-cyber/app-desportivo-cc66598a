import { AuthGuard } from "@/components/AuthGuard";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import {
  User,
  HelpCircle,
  FileText,
  Shield,
  Bell,
  History,
  LogOut,
  ChevronRight,
  Share2,
  Copy,
  Check,
  Moon,
  Sun,
  Settings,
  Trophy,
  Users,
  TrendingUp,
  Target,
  Music,
  Building2,
  Crown,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const menuItems = [
  { icon: User, label: "Perfil", description: "Gerir informações pessoais", action: "perfil" },
  { icon: Share2, label: "Convites", description: "Indicar novos usuários", action: "convites" },
  { icon: Users, label: "Minha Loja", description: "Gerir loja e produtos", action: "minha-loja" },
  { icon: FileText, label: "Meus Anúncios", description: "Gerir anúncios no mercado", action: "meus-anuncios" },
  { icon: Music, label: "Perfil Artista", description: "Gerir perfil de artista", action: "meu-perfil-artista" },
  { icon: Building2, label: "Minha Produtora", description: "Gerir produtora e músicos", action: "minha-produtora" },
  { icon: Crown, label: "Planos Comerciais", description: "Planos e selo verificado", action: "planos-comerciais" },
  { icon: Music, label: "Artistas & Músicos", description: "Ver artistas disponíveis", action: "artistas" },
  { icon: HelpCircle, label: "Suporte", description: "Fale connosco", action: "suporte" },
  { icon: FileText, label: "FAQ", description: "Perguntas frequentes", action: "faq" },
  { icon: FileText, label: "Termos", description: "Termos e condições", action: "termos" },
  { icon: Shield, label: "Segurança", description: "Autenticação 2FA", action: "seguranca" },
  { icon: Bell, label: "Notificações", description: "Gerir notificações", action: "notificacoes" },
  { icon: History, label: "Histórico", description: "Bilhetes anteriores", action: "historico" },
];

export default function Menu() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { isAdmin } = useAdminCheck();
  const [showConvitesDialog, setShowConvitesDialog] = useState(false);
  const [codigoConvite, setCodigoConvite] = useState("");
  const [totalConvidados, setTotalConvidados] = useState(0);
  const [convidadosAtivos, setConvidadosAtivos] = useState(0);
  const [totalGanho, setTotalGanho] = useState(0);
  const [proximaMeta, setProximaMeta] = useState<{ convidados: number; bonus: number } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadReferralData();
  }, []);

  const loadReferralData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: referral, error } = await supabase
        .from("referrals")
        .select("codigo_convite")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      // Dynamic count from invited_users
      const { count } = await supabase
        .from("invited_users")
        .select("*", { count: "exact", head: true })
        .eq("referrer_id", user.id);

      setTotalConvidados(count || 0);

      // Count active invites (convidados que já fizeram depósito)
      const { data: invitedList } = await supabase
        .from("invited_users")
        .select("invited_user_id")
        .eq("referrer_id", user.id);

      if (invitedList && invitedList.length > 0) {
        const invitedIds = invitedList.map(i => i.invited_user_id);
        const { count: activeCount } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .in("id", invitedIds)
          .eq("primeiro_deposito_processado", true);
        setConvidadosAtivos(activeCount || 0);
      }

      // Total earned from referral bonuses
      const { data: bonusData } = await supabase
        .from("bonus_convite_historico" as any)
        .select("valor_bonus")
        .eq("referrer_id", user.id);

      if (bonusData) {
        const total = (bonusData as any[]).reduce((sum: number, b: any) => sum + Number(b.valor_bonus || 0), 0);
        setTotalGanho(total);
      }

      // Load goals config and calculate next goal
      const { data: metasConfig } = await supabase
        .from("configuracoes_sistema")
        .select("valor")
        .eq("chave", "metas_convite_niveis")
        .single();

      const { data: metasAtivoConfig } = await supabase
        .from("configuracoes_sistema")
        .select("valor")
        .eq("chave", "metas_convite_ativo")
        .single();

      if (metasAtivoConfig?.valor === 'true' && metasConfig?.valor) {
        try {
          const metas = JSON.parse(metasConfig.valor) as { convidados: number; bonus: number }[];
          const activeInvites = convidadosAtivos || 0;
          const nextMeta = metas
            .sort((a, b) => a.convidados - b.convidados)
            .find(m => m.convidados > activeInvites);
          setProximaMeta(nextMeta || null);
        } catch {}
      }

      if (referral) {
        setCodigoConvite(referral.codigo_convite);
      } else {
        // Generate new referral code
        const { data: newCode } = await supabase.rpc("generate_referral_code");
        
        const { error: insertError } = await supabase
          .from("referrals")
          .insert({
            user_id: user.id,
            codigo_convite: newCode,
            total_convidados: 0,
          });

        if (insertError) throw insertError;
        setCodigoConvite(newCode);
      }
    } catch (error: any) {
      console.error("Erro ao carregar dados de convite:", error);
    }
  };

  const handleMenuClick = (action: string) => {
    if (action === "convites") {
      setShowConvitesDialog(true);
    } else if (action === "admin") {
      navigate("/admin");
    } else if (action === "seguranca") {
      navigate("/seguranca");
    } else if (action === "minha-loja") {
      navigate("/minha-loja");
    } else if (action === "meus-anuncios") {
      navigate("/meus-anuncios");
    } else {
      toast({
        title: "Em desenvolvimento",
        description: "Esta funcionalidade estará disponível em breve.",
      });
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/login");
      toast({
        title: "Sessão encerrada",
        description: "Até breve!",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/login?ref=${codigoConvite}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast({
      title: "Link copiado!",
      description: "Link de convite copiado para a área de transferência.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(codigoConvite);
    toast({
      title: "Código copiado!",
      description: "Código de convite copiado para a área de transferência.",
    });
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-subtle pb-20 p-4">
        <div className="max-w-2xl mx-auto pt-6 space-y-6">
          <h1 className="text-3xl font-bold text-foreground">Menu</h1>

          <Card className="p-4 shadow-soft rounded-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
                  {theme === "dark" ? (
                    <Moon className="w-5 h-5 text-white" />
                  ) : (
                    <Sun className="w-5 h-5 text-white" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-foreground">Modo Escuro</p>
                  <p className="text-sm text-muted-foreground">
                    Alternar entre claro e escuro
                  </p>
                </div>
              </div>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              />
            </div>
          </Card>

          <Card className="divide-y divide-border shadow-soft rounded-2xl overflow-hidden">
            {isAdmin && (
              <button
                onClick={() => handleMenuClick("admin")}
                className="w-full p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors bg-primary/5"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-foreground">Administração</p>
                  <p className="text-sm text-muted-foreground">
                    Painel administrativo
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={() => handleMenuClick(item.action)}
                className="w-full p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-foreground">{item.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            ))}
          </Card>

          <Button
            onClick={handleLogout}
            variant="destructive"
            className="w-full h-12 rounded-xl font-semibold"
          >
            <LogOut className="w-5 h-5 mr-2" />
            Terminar Sessão
          </Button>
        </div>
      </div>
      <BottomNav />

      <Dialog open={showConvitesDialog} onOpenChange={setShowConvitesDialog}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Programa de Convites</DialogTitle>
            <DialogDescription>
              Convide amigos e ganhe bónus quando eles fizerem o primeiro depósito.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-primary/10 p-3 rounded-lg text-center">
                <Users className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-xl font-bold text-primary">{totalConvidados}</p>
                <p className="text-xs text-muted-foreground">Total Convidados</p>
              </div>
              <div className="bg-green-500/10 p-3 rounded-lg text-center">
                <TrendingUp className="w-5 h-5 text-green-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-green-500">{convidadosAtivos}</p>
                <p className="text-xs text-muted-foreground">Convidados Ativos</p>
              </div>
              <div className="bg-amber-500/10 p-3 rounded-lg text-center">
                <Trophy className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-amber-500">{totalGanho.toLocaleString('pt-AO')} Kz</p>
                <p className="text-xs text-muted-foreground">Total Ganho</p>
              </div>
              <div className="bg-purple-500/10 p-3 rounded-lg text-center">
                <Target className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                {proximaMeta ? (
                  <>
                    <p className="text-xl font-bold text-purple-500">{proximaMeta.convidados}</p>
                    <p className="text-xs text-muted-foreground">Próxima Meta ({proximaMeta.bonus.toLocaleString('pt-AO')} Kz)</p>
                  </>
                ) : (
                  <>
                    <p className="text-xl font-bold text-purple-500">✓</p>
                    <p className="text-xs text-muted-foreground">Metas Completas</p>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Seu Código de Convite</label>
              <div className="flex gap-2">
                <Input
                  value={codigoConvite}
                  readOnly
                  className="font-mono"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={copyInviteCode}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Link de Convite</label>
              <div className="flex gap-2">
                <Input
                  value={`${window.location.origin}/login?ref=${codigoConvite}`}
                  readOnly
                  className="text-sm"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={copyInviteLink}
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AuthGuard>
  );
}
