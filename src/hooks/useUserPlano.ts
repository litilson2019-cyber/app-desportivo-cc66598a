import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UserPlanoAtivo {
  id: string;
  plano_id: string;
  expira_em: string;
  ativado_em: string;
  preco_pago: number;
  plano: {
    nome: string;
    descricao: string | null;
    duracao_dias: number;
    beneficios: any;
  } | null;
}

export const useUserPlano = () => {
  const [plano, setPlano] = useState<UserPlanoAtivo | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPlano(null);
        return;
      }
      const { data } = await supabase
        .from("user_planos")
        .select("id, plano_id, expira_em, ativado_em, preco_pago, plano:planos_carteira(nome, descricao, duracao_dias, beneficios)")
        .eq("user_id", user.id)
        .eq("ativo", true)
        .gt("expira_em", new Date().toISOString())
        .order("expira_em", { ascending: false })
        .limit(1)
        .maybeSingle();
      setPlano((data as any) || null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("user_planos_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_planos" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  return { plano, loading, hasActivePlano: !!plano, reload: load };
};
