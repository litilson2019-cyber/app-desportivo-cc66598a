import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, TrendingUp, RefreshCw, WifiOff } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  let [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [last_name, setLastName] = useState("");
  const [connectionError, setConnectionError] = useState(false);
  const [retrying, setRetrying] = useState(false);

  // Capture ref parameter and save to localStorage
  useEffect(() => {
    const refParam = searchParams.get("ref");
    if (refParam) {
      localStorage.setItem("convite_id", refParam);
    }
  }, [searchParams]);

  // Check if already logged in
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          navigate("/", { replace: true });
        }
        setConnectionError(false);
      } catch (error) {
        console.log("Session check failed, connection issue");
      }
    };
    checkSession();
  }, [navigate]);

  const testConnection = async () => {
    setRetrying(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`https://ipitxugsxcupaexhgcim.supabase.co/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwaXR4dWdzeGN1cGFleGhnY2ltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTgyMTIsImV4cCI6MjA3OTAzNDIxMn0.FxIdqL7JskGPBFZkavnzBeYU9PF8aIyI4fKjseUH0NM'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        setConnectionError(false);
        toast({
          title: "Conexão restaurada",
          description: "Você já pode fazer login ou criar conta.",
        });
      }
    } catch (error) {
      setConnectionError(true);
      toast({
        title: "Sem conexão",
        description: "Não foi possível conectar ao servidor. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setRetrying(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setConnectionError(false);

    try {
      const isEmail = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/.test(email);
      if (isEmail) {
        email = `${email}`;
      } else {
        email = `${email}@gmail.com`;
      }

      if (isLogin) {
        const attemptLogin = async (retries = 3): Promise<void> => {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) {
            const isNetwork = error.message.includes("fetch") || error.message.includes("network") || error.message.includes("Failed");
            if (isNetwork && retries > 0) {
              await new Promise(r => setTimeout(r, Math.pow(2, 3 - retries) * 1000));
              return attemptLogin(retries - 1);
            }
            if (isNetwork) {
              setConnectionError(true);
              throw new Error("Erro de conexão. Verifique sua internet e tente novamente.");
            }
            throw error;
          }
        };
        await attemptLogin();
        
        // Check if account is admin-only
        const { data: { user: loggedUser } } = await supabase.auth.getUser();
        if (loggedUser) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('tipo_conta')
            .eq('id', loggedUser.id)
            .maybeSingle();
          
          if (profileData?.tipo_conta === 'admin' || profileData?.tipo_conta === 'super_admin') {
            // Admin accounts go directly to admin panel
            toast({ title: "Bem-vindo!", description: "Redirecionado ao painel administrativo." });
            navigate("/admin");
            setLoading(false);
            return;
          }
        }
        
        toast({ title: "Bem-vindo de volta!", description: "Login realizado com sucesso." });
        navigate("/");
      } else {
        if (password.length < 6) {
          throw new Error("A senha deve ter pelo menos 6 caracteres.");
        }

        const attemptSignup = async (retries = 3) => {
          const { error, data } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { nome_completo: nome + " " + last_name },
              emailRedirectTo: `${window.location.origin}/`,
            },
          });

          if (error) {
            const isNetwork =
              error.message.includes("fetch") ||
              error.message.includes("network") ||
              error.message.includes("Failed");

            if (isNetwork && retries > 0) {
              await new Promise((r) =>
                setTimeout(r, Math.pow(2, 3 - retries) * 1000)
              );
              return attemptSignup(retries - 1);
            }

            if (isNetwork) {
              setConnectionError(true);
              throw new Error(
                "Erro de conexão. Verifique sua internet e tente novamente."
              );
            }

            if (error.message.includes("already registered")) {
              throw new Error("Este email já está cadastrado. Tente fazer login.");
            }

            throw error;
          }

          return data;
        };

        const data = await attemptSignup();

        const userId = data.user.id;
        const valor = parseFloat("500");
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ saldo: valor })
          .eq('id', userId);

        if (updateError) throw updateError;

        // Process referral if convite_id exists
        const conviteId = localStorage.getItem("convite_id");
        if (conviteId && conviteId !== userId) {
          try {
            // Check if referrer exists
            const { data: referrerProfile } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', conviteId)
              .maybeSingle();

            if (referrerProfile) {
              // Insert into invited_users
              await supabase
                .from('invited_users')
                .insert({
                  referrer_id: conviteId,
                  invited_user_id: userId,
                });

              // total_convidados is now calculated dynamically from invited_users
            }
          } catch (refError) {
            console.error('Referral processing error:', refError);
          } finally {
            localStorage.removeItem("convite_id");
          }
        } else {
          localStorage.removeItem("convite_id");
        }

        toast({ title: "Conta criada!", description: "Bem-vindo à plataforma. - recebeste 500kz de Bónus de boas vindas" });
        navigate("/");
      }
    } catch (error: any) {
      const errorMessage = error.message || "Ocorreu um erro. Tente novamente.";
      if (errorMessage.includes("Failed to fetch") || errorMessage.includes("fetch")) {
        setConnectionError(true);
        toast({ title: "Erro de Conexão", description: "Não foi possível conectar ao servidor. Verifique sua internet.", variant: "destructive" });
      } else {
        toast({ title: "Erro", description: errorMessage, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 shadow-strong">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center">
            <TrendingUp className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            BetBuilder Pro
          </h1>
        </div>

        {connectionError && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
            <div className="flex items-center gap-2 text-destructive mb-2">
              <WifiOff className="w-5 h-5" />
              <span className="font-semibold">Problema de Conexão</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Não foi possível conectar ao servidor. Isso pode ser temporário.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={testConnection}
              disabled={retrying}
              className="w-full"
            >
              {retrying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Tentar Reconectar
                </>
              )}
            </Button>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="nome">Primeiro Nome</Label>
              <Input
                id="nome"
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required={!isLogin}
                className="rounded-xl"
                placeholder="Seu primeiro nome "
              />
            </div>
          )}

          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="last_name">Último nome</Label>
              <Input
                id="last_name"
                type="text"
                value={last_name}
                onChange={(e) => setLastName(e.target.value)}
                required={!isLogin}
                className="rounded-xl"
                placeholder="Seu último nome"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email ou Telefone</Label>
            <Input
              id="email"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="rounded-xl"
              placeholder="email ou 923450000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="rounded-xl"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <Button
            type="submit"
            disabled={loading || connectionError}
            className="w-full bg-gradient-primary hover:opacity-90 text-white rounded-xl h-12 font-semibold"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isLogin ? (
              "Entrar"
            ) : (
              "Criar Conta"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-primary hover:underline"
          >
            {isLogin
              ? "Não tem conta? Criar conta"
              : "Já tem conta? Fazer login"}
          </button>
        </div>
      </Card>
    </div>
  );
}
