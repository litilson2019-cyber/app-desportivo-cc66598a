import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function Index() {
  const [nome, setNome] = useState("Investidor");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("nome_completo")
        .eq("id", user.id)
        .single();

      if (profile) {
        setNome(profile.nome_completo || "Investidor");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
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

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-subtle pb-20 p-4">
        <div className="max-w-2xl mx-auto pt-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Olá, {nome}!</h1>
            <p className="text-muted-foreground">Bem-vindo ao sistema</p>
          </div>

          <Card className="p-8 shadow-soft rounded-2xl">
            <p className="text-center text-muted-foreground">
              Use o menu de navegação para acessar as funcionalidades
            </p>
          </Card>
        </div>
      </div>
      <BottomNav />
    </AuthGuard>
  );
}
