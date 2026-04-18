import { useEffect, useMemo, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useUserPlano } from "@/hooks/useUserPlano";
import { useNavigate } from "react-router-dom";
import { Flame, Lock, Loader2, Calendar, Clock } from "lucide-react";

interface OddCasa {
  id: string;
  casa_aposta: string;
  odd_casa: number | null;
  odd_empate: number | null;
  odd_fora: number | null;
}

interface Jogo {
  id: string;
  equipa_casa: string;
  equipa_fora: string;
  competicao: string | null;
  data_inicio: string;
  ativo: boolean;
  odds_casas: OddCasa[];
}

export default function Odds() {
  const navigate = useNavigate();
  const { hasActivePlano, loading: loadingPlano } = useUserPlano();
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!hasActivePlano) return;
    load();
    const channel = supabase
      .channel("odds_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "odds_jogos" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "odds_casas" }, () => load())
      .subscribe();
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(t);
    };
  }, [hasActivePlano]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("odds_jogos")
      .select("id, equipa_casa, equipa_fora, competicao, data_inicio, ativo, odds_casas(*)")
      .eq("ativo", true)
      .order("data_inicio", { ascending: true });
    setJogos((data as any) || []);
    setLoading(false);
  };

  const visiveis = useMemo(() => {
    return jogos.filter((j) => {
      const inicio = new Date(j.data_inicio).getTime();
      return now < inicio + 45 * 60 * 1000;
    });
  }, [jogos, now]);

  if (loadingPlano) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </AuthGuard>
    );
  }

  if (!hasActivePlano) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gradient-subtle pb-20 p-4">
          <div className="max-w-2xl mx-auto pt-10 space-y-4">
            <Card className="p-8 text-center rounded-2xl shadow-soft">
              <Lock className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <h2 className="text-xl font-bold mb-2">Conteúdo Premium</h2>
              <p className="text-sm text-muted-foreground mb-4">
                A comparação de odds está disponível apenas para utilizadores com plano ativo.
              </p>
              <Button className="w-full h-11 rounded-xl" onClick={() => navigate("/planos")}>
                Ver Planos
              </Button>
            </Card>
          </div>
        </div>
        <BottomNav />
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-subtle pb-20 p-4">
        <div className="max-w-2xl mx-auto pt-6 space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Odds</h1>
            <p className="text-sm text-muted-foreground uppercase tracking-wide">
              Comparação de odds por casas de apostas
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center p-10"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : visiveis.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground rounded-2xl">
              Sem jogos disponíveis de momento.
            </Card>
          ) : (
            visiveis.map((jogo) => <JogoCard key={jogo.id} jogo={jogo} />)
          )}
        </div>
      </div>
      <BottomNav />
    </AuthGuard>
  );
}

function JogoCard({ jogo }: { jogo: Jogo }) {
  const data = new Date(jogo.data_inicio);
  const dia = data.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
  const hora = data.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });

  const best = useMemo(() => {
    const result = { casa: -Infinity, empate: -Infinity, fora: -Infinity };
    jogo.odds_casas.forEach((o) => {
      if (o.odd_casa && o.odd_casa > result.casa) result.casa = o.odd_casa;
      if (o.odd_empate && o.odd_empate > result.empate) result.empate = o.odd_empate;
      if (o.odd_fora && o.odd_fora > result.fora) result.fora = o.odd_fora;
    });
    return result;
  }, [jogo.odds_casas]);

  return (
    <Card className="p-4 rounded-2xl shadow-soft">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-base">
            {jogo.equipa_casa} <span className="text-muted-foreground">vs</span> {jogo.equipa_fora}
          </h3>
          {jogo.competicao && <Badge variant="secondary" className="mt-1 text-[10px]">{jogo.competicao}</Badge>}
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p className="flex items-center gap-1 justify-end"><Calendar className="w-3 h-3" />{dia}</p>
          <p className="flex items-center gap-1 justify-end"><Clock className="w-3 h-3" />{hora}</p>
        </div>
      </div>

      {jogo.odds_casas.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">Sem odds disponíveis</p>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_repeat(3,minmax(0,1fr))] gap-2 text-[10px] uppercase text-muted-foreground font-medium px-1">
            <span>Casa</span>
            <span className="text-center">{jogo.equipa_casa.slice(0, 8)}</span>
            <span className="text-center">Empate</span>
            <span className="text-center">{jogo.equipa_fora.slice(0, 8)}</span>
          </div>
          {jogo.odds_casas.map((o) => (
            <div key={o.id} className="grid grid-cols-[1fr_repeat(3,minmax(0,1fr))] gap-2 items-center bg-muted/30 rounded-lg p-2">
              <span className="text-sm font-medium truncate">{o.casa_aposta}</span>
              <OddCell value={o.odd_casa} isBest={o.odd_casa === best.casa && best.casa > 0} />
              <OddCell value={o.odd_empate} isBest={o.odd_empate === best.empate && best.empate > 0} />
              <OddCell value={o.odd_fora} isBest={o.odd_fora === best.fora && best.fora > 0} />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function OddCell({ value, isBest }: { value: number | null; isBest: boolean }) {
  if (value == null) return <span className="text-center text-xs text-muted-foreground">—</span>;
  return (
    <div className={`text-center text-sm font-semibold rounded-md py-1 flex items-center justify-center gap-1 ${isBest ? "bg-amber-500/20 text-amber-600 dark:text-amber-400" : ""}`}>
      {value.toFixed(2)} {isBest && <Flame className="w-3 h-3" />}
    </div>
  );
}
