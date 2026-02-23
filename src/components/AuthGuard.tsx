import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const mountedRef = useRef(true);
  const initRef = useRef(false);

  const checkSession = async (isRetry = false) => {
    if (!mountedRef.current) return;
    
    if (isRetry) {
      setNetworkError(false);
      setLoading(true);
    }

    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (!mountedRef.current) return;

      if (error) {
        // Check if it's a network error vs auth error
        const isNetwork = error.message?.includes("fetch") || error.message?.includes("network") || error.message?.includes("Failed");
        if (isNetwork) {
          setNetworkError(true);
          setLoading(false);
          return;
        }
        // Auth error — session is invalid, go to login
        navigate("/login", { replace: true });
        return;
      }

      if (!session) {
        navigate("/login", { replace: true });
        return;
      }

      setAuthenticated(true);
      setNetworkError(false);
      setLoading(false);
    } catch (err: any) {
      if (!mountedRef.current) return;
      // Network failure — show retry UI instead of redirecting
      setNetworkError(true);
      setLoading(false);
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    if (!initRef.current) {
      initRef.current = true;
      checkSession();
    }

    // Listen for ongoing auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mountedRef.current) return;
        if (!session) {
          setAuthenticated(false);
          navigate("/login", { replace: true });
        } else {
          setAuthenticated(true);
          setNetworkError(false);
          setLoading(false);
        }
      }
    );

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Network error — show retry screen instead of infinite loop
  if (networkError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-subtle gap-4 p-6 text-center">
        <WifiOff className="w-12 h-12 text-muted-foreground" />
        <h2 className="text-lg font-semibold text-foreground">Problema de Conexão</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          Não foi possível conectar ao servidor. Verifique a sua internet e tente novamente.
        </p>
        <Button onClick={() => checkSession(true)} className="mt-2">
          <RefreshCw className="w-4 h-4 mr-2" />
          Tentar Novamente
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-subtle">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
};
