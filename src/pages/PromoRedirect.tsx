import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function PromoRedirect() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (code) handleRedirect(code);
  }, [code]);

  const handleRedirect = async (codigo: string) => {
    try {
      // Find the link
      const { data: link } = await supabase
        .from("divulgacao_links")
        .select("id, tipo, item_id, user_id")
        .eq("codigo", codigo)
        .eq("ativo", true)
        .maybeSingle();

      if (!link) {
        setError(true);
        setTimeout(() => navigate("/"), 2000);
        return;
      }

      // Record click (anti-fraud: don't track own clicks)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== link.user_id) {
        await supabase.from("divulgacao_cliques").insert({
          link_id: link.id,
          referrer_user_id: user?.id || null,
        });

        // Increment click counter
        await supabase
          .from("divulgacao_links")
          .update({ cliques: (await supabase.from("divulgacao_links").select("cliques").eq("id", link.id).single()).data?.cliques + 1 || 1 })
          .eq("id", link.id);
      }

      // Redirect based on type
      if (link.tipo === "produto") {
        navigate(`/produto/${link.item_id}`, { replace: true });
      } else if (link.tipo === "loja") {
        navigate(`/loja/${link.item_id}`, { replace: true });
      } else if (link.tipo === "anuncio") {
        navigate(`/marketplace`, { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (err) {
      console.error(err);
      navigate("/", { replace: true });
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <p className="text-muted-foreground text-sm">Link inválido ou expirado. A redirecionar...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}
