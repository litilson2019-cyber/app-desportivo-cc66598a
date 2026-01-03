import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, TrendingUp, RefreshCw, WifiOff } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [connectionError, setConnectionError] = useState(false);
  const [retrying, setRetrying] = useState(false);

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
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message.includes("fetch") || error.message.includes("network")) {
            setConnectionError(true);
            throw new Error("Erro de conexão. Verifique sua internet e tente novamente.");
          }
          throw error;
        }

        toast({
          title: "Bem-vindo de volta!",
          description: "Login realizado com sucesso.",
        });
        navigate("/");
      } else {
        if (password.length < 6) {
          throw new Error("A senha deve ter pelo menos 6 caracteres.");
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              nome_completo: nome,
            },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) {
          if (error.message.includes("fetch") || error.message.includes("network")) {
            setConnectionError(true);
            throw new Error("Erro de conexão. Verifique sua internet e tente novamente.");
          }
          if (error.message.includes("already registered")) {
            throw new Error("Este email já está cadastrado. Tente fazer login.");
          }
          throw error;
        }

        toast({
          title: "Conta criada!",
          description: "Bem-vindo à plataforma.",
        });
        navigate("/");
      }
    } catch (error: any) {
      const errorMessage = error.message || "Ocorreu um erro. Tente novamente.";
      
      // Check if it's a network error
      if (errorMessage.includes("Failed to fetch") || errorMessage.includes("fetch")) {
        setConnectionError(true);
        toast({
          title: "Erro de Conexão",
          description: "Não foi possível conectar ao servidor. Verifique sua internet.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: errorMessage,
          variant: "destructive",
        });
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
              <Label htmlFor="nome">Nome Completo</Label>
              <Input
                id="nome"
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required={!isLogin}
                className="rounded-xl"
                placeholder="Seu nome"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="rounded-xl"
              placeholder="seu@email.com"
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
