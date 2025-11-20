import { AuthGuard } from "@/components/AuthGuard";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
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
  const [showConvitesDialog, setShowConvitesDialog] = useState(false);
  const [codigoConvite, setCodigoConvite] = useState("");
  const [totalConvidados, setTotalConvidados] = useState(0);
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
        .select("codigo_convite, total_convidados")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (referral) {
        setCodigoConvite(referral.codigo_convite);
        setTotalConvidados(referral.total_convidados);
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

          <Card className="divide-y divide-border shadow-soft rounded-2xl overflow-hidden">
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Convide Amigos</DialogTitle>
            <DialogDescription>
              Compartilhe seu código de convite e ganhe benefícios quando seus amigos se cadastrarem.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Seus Convites</p>
              <p className="text-2xl font-bold text-foreground">{totalConvidados}</p>
              <p className="text-xs text-muted-foreground">pessoas convidadas</p>
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
                    <Check className="w-4 h-4 text-success" />
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
