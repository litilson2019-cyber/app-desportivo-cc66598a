import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const checkedRef = useRef(false);

  useEffect(() => {
    // Set a timeout to prevent infinite loading
    timeoutRef.current = setTimeout(() => {
      if (loading && !authenticated) {
        // Clear any stale tokens and redirect to login
        localStorage.removeItem('sb-ipitxugsxcupaexhgcim-auth-token');
        navigate("/login", { replace: true });
      }
    }, 5000); // 5 second timeout

    const checkSession = async () => {
      if (checkedRef.current) return;
      checkedRef.current = true;
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          // Clear potentially corrupted tokens
          if (error) {
            localStorage.removeItem('sb-ipitxugsxcupaexhgcim-auth-token');
          }
          navigate("/login", { replace: true });
          return;
        }
        
        setAuthenticated(true);
        setLoading(false);
      } catch (err) {
        // On network error, redirect to login
        localStorage.removeItem('sb-ipitxugsxcupaexhgcim-auth-token');
        navigate("/login", { replace: true });
      }
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setAuthenticated(false);
        navigate("/login", { replace: true });
      } else {
        setAuthenticated(true);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [navigate, loading, authenticated]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-subtle">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
};
