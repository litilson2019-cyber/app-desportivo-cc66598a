import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SystemConfig {
  preco_modo_arriscado: number;
  preco_modo_seguro: number;
  deposito_minimo: number;
  deposito_maximo: number;
  limite_jogos_arriscado: number;
  limite_jogos_seguro: number;
  desconto_apenas_com_resultados: boolean;
}

interface MetodoDeposito {
  id: string;
  nome: string;
  tipo: string;
  iban: string | null;
  numero_express: string | null;
  titular_conta: string | null;
  ativo: boolean;
  ordem: number;
}

interface UseSystemConfigReturn {
  config: SystemConfig;
  metodosDeposito: MetodoDeposito[];
  loading: boolean;
  refetch: () => Promise<void>;
}

const defaultConfig: SystemConfig = {
  preco_modo_arriscado: 200,
  preco_modo_seguro: 300,
  deposito_minimo: 1000,
  deposito_maximo: 500000,
  limite_jogos_arriscado: 5,
  limite_jogos_seguro: 3,
  desconto_apenas_com_resultados: true,
};

export function useSystemConfig(): UseSystemConfigReturn {
  const [config, setConfig] = useState<SystemConfig>(defaultConfig);
  const [metodosDeposito, setMetodosDeposito] = useState<MetodoDeposito[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [configRes, metodosRes] = await Promise.all([
        supabase.from("configuracoes_sistema").select("*"),
        supabase
          .from("metodos_deposito")
          .select("*")
          .eq("ativo", true)
          .order("ordem", { ascending: true }),
      ]);

      if (configRes.data) {
        const configMap: Record<string, string> = {};
        configRes.data.forEach((c) => {
          if (c.chave && c.valor) {
            configMap[c.chave] = c.valor;
          }
        });

        setConfig({
          preco_modo_arriscado: Number(configMap.preco_modo_arriscado) || defaultConfig.preco_modo_arriscado,
          preco_modo_seguro: Number(configMap.preco_modo_seguro) || defaultConfig.preco_modo_seguro,
          deposito_minimo: Number(configMap.deposito_minimo) || defaultConfig.deposito_minimo,
          deposito_maximo: Number(configMap.deposito_maximo) || defaultConfig.deposito_maximo,
          limite_jogos_arriscado: Number(configMap.limite_jogos_arriscado) || defaultConfig.limite_jogos_arriscado,
          limite_jogos_seguro: Number(configMap.limite_jogos_seguro) || defaultConfig.limite_jogos_seguro,
          desconto_apenas_com_resultados: configMap.desconto_apenas_com_resultados !== 'false',
        });
      }

      if (metodosRes.data) {
        setMetodosDeposito(metodosRes.data);
      }
    } catch (error) {
      console.error("Error fetching system config:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Setup realtime subscriptions
    const configChannel = supabase
      .channel("system-config-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "configuracoes_sistema",
        },
        () => {
          console.log("Config changed, refetching...");
          fetchData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "metodos_deposito",
        },
        () => {
          console.log("Metodos changed, refetching...");
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(configChannel);
    };
  }, []);

  return {
    config,
    metodosDeposito,
    loading,
    refetch: fetchData,
  };
}
