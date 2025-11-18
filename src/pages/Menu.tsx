import { AuthGuard } from "@/components/AuthGuard";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  HelpCircle,
  FileText,
  Shield,
  Bell,
  History,
  LogOut,
  ChevronRight,
} from "lucide-react";

const menuItems = [
  { icon: User, label: "Perfil", description: "Gerir informações pessoais" },
  { icon: HelpCircle, label: "Suporte", description: "Fale connosco" },
  { icon: FileText, label: "FAQ", description: "Perguntas frequentes" },
  { icon: FileText, label: "Termos", description: "Termos e condições" },
  { icon: Shield, label: "Segurança", description: "Autenticação 2FA" },
  { icon: Bell, label: "Notificações", description: "Gerir notificações" },
  { icon: History, label: "Histórico", description: "Bilhetes anteriores" },
];

export default function Menu() {
  const navigate = useNavigate();
  const { toast } = useToast();

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

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-subtle pb-20 p-4">
        <div className="max-w-2xl mx-auto pt-6 space-y-6">
          <h1 className="text-3xl font-bold text-foreground">Menu</h1>

          <Card className="divide-y divide-border shadow-soft rounded-2xl overflow-hidden">
            {menuItems.map((item, index) => (
              <button
                key={index}
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
    </AuthGuard>
  );
}
