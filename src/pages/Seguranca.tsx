import { AuthGuard } from "@/components/AuthGuard";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, Eye, EyeOff, Loader2 } from "lucide-react";

export default function Seguranca() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAtual, setShowAtual] = useState(false);
  const [showNova, setShowNova] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (novaSenha.length < 6) {
      toast({ title: "Erro", description: "A nova senha deve ter pelo menos 6 caracteres.", variant: "destructive" });
      return;
    }

    if (novaSenha !== confirmarSenha) {
      toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Verify current password by re-authenticating
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("Usuário não encontrado.");

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: senhaAtual,
      });

      if (signInError) {
        toast({ title: "Erro", description: "Senha atual incorreta.", variant: "destructive" });
        setLoading(false);
        return;
      }

      // Update password
      const { error } = await supabase.auth.updateUser({ password: novaSenha });

      if (error) throw error;

      toast({ title: "Sucesso", description: "Senha alterada com sucesso!" });
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarSenha("");
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Não foi possível alterar a senha.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-subtle pb-20 p-4">
        <div className="max-w-2xl mx-auto pt-6 space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/menu")} className="rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Segurança</h1>
          </div>

          <Card className="p-6 shadow-soft rounded-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
                <Lock className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Alterar Senha</p>
                <p className="text-sm text-muted-foreground">Atualize a sua senha de acesso</p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="senha-atual">Senha Atual</Label>
                <div className="relative">
                  <Input
                    id="senha-atual"
                    type={showAtual ? "text" : "password"}
                    value={senhaAtual}
                    onChange={(e) => setSenhaAtual(e.target.value)}
                    required
                    className="rounded-xl pr-10"
                    placeholder="Digite a sua senha atual"
                  />
                  <button type="button" onClick={() => setShowAtual(!showAtual)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showAtual ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nova-senha">Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="nova-senha"
                    type={showNova ? "text" : "password"}
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    required
                    minLength={6}
                    className="rounded-xl pr-10"
                    placeholder="Digite a nova senha"
                  />
                  <button type="button" onClick={() => setShowNova(!showNova)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showNova ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmar-senha">Confirmar Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="confirmar-senha"
                    type={showConfirmar ? "text" : "password"}
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    required
                    minLength={6}
                    className="rounded-xl pr-10"
                    placeholder="Confirme a nova senha"
                  />
                  <button type="button" onClick={() => setShowConfirmar(!showConfirmar)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showConfirmar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl font-semibold bg-gradient-primary hover:opacity-90 text-white">
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                Alterar Senha
              </Button>
            </form>
          </Card>
        </div>
      </div>
      <BottomNav />
    </AuthGuard>
  );
}
