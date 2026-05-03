import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AuthGuard } from "@/components/AuthGuard";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useUserPlano } from "@/hooks/useUserPlano";
import { ArrowLeft, Calendar, Clock, Flame, Loader2, Lock, TrendingUp, TrendingDown, Trophy, Heart } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { SmartBetMode } from "@/components/SmartBetMode";

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

type MercadoKey = "casa" | "empate" | "fora";

interface MercadoStats {
  key: MercadoKey;
  label: string;
  melhorCasa: string | null;
  melhorOdd: number | null;
  piorCasa: string | null;
  piorOdd: number | null;
  media: number | null;
  diffPct: number;
  total: number;
}

function calcularMercado(jogo: Jogo, key: MercadoKey, label: string): MercadoStats {
  const field = key === "casa" ? "odd_casa" : key === "empate" ? "odd_empate" : "odd_fora";
  const valores = jogo.odds_casas
    .map((o) => ({ casa: o.casa_aposta, val: o[field as keyof OddCasa] as number | null }))
    .filter((v) => v.val != null && v.val > 0) as { casa: string; val: number }[];

  if (valores.length === 0) {
    return { key, label, melhorCasa: null, melhorOdd: null, piorCasa: null, piorOdd: null, media: null, diffPct: 0, total: 0 };
  }
  const max = valores.reduce((a, b) => (b.val > a.val ? b : a));
  const min = valores.reduce((a, b) => (b.val < a.val ? b : a));
  const media = valores.reduce((s, v) => s + v.val, 0) / valores.length;
  const diffPct = valores.length > 1 ? ((max.val - min.val) / min.val) * 100 : 0;
  return {
    key, label,
    melhorCasa: max.casa, melhorOdd: max.val,
    piorCasa: min.casa, piorOdd: min.val,
    media, diffPct, total: valores.length,
  };
}

export default function OddsDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasActivePlano, loading: loadingPlano } = useUserPlano();
  const [jogo, setJogo] = useState<Jogo | null>(null);
  const [loading, setLoading] = useState(true);
  const [favorito, setFavorito] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  useEffect(() => {
    if (!id || !hasActivePlano) return;
    load();
    loadFavorito();
    const channel = supabase
      .channel(`odds_detalhe_${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "odds_casas", filter: `jogo_id=eq.${id}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "odds_jogos", filter: `id=eq.${id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, hasActivePlano]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("odds_jogos")
      .select("id, equipa_casa, equipa_fora, competicao, data_inicio, ativo, odds_casas(*)")
      .eq("id", id!)
      .maybeSingle();
    setJogo((data as any) || null);
    setLoading(false);
  };

  const loadFavorito = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !id) return;
    const { data } = await supabase
      .from("odds_favoritos")
      .select("id")
      .eq("user_id", user.id)
      .eq("jogo_id", id)
      .maybeSingle();
    setFavorito(!!data);
  };

  const toggleFavorito = async () => {
    if (!id || favLoading) return;
    setFavLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setFavLoading(false); return; }

    if (favorito) {
      const { error } = await supabase.from("odds_favoritos").delete()
        .eq("user_id", user.id).eq("jogo_id", id);
      if (!error) { setFavorito(false); toast({ title: "Removido dos favoritos" }); }
      else toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      const { error } = await supabase.from("odds_favoritos").insert({ user_id: user.id, jogo_id: id });
      if (!error) { setFavorito(true); toast({ title: "Salvo nos favoritos ❤️" }); }
      else toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
    setFavLoading(false);
  };

  const mercados = useMemo<MercadoStats[]>(() => {
    if (!jogo) return [];
    return [
      calcularMercado(jogo, "casa", `Vitória ${jogo.equipa_casa}`),
      calcularMercado(jogo, "empate", "Empate"),
      calcularMercado(jogo, "fora", `Vitória ${jogo.equipa_fora}`),
    ];
  }, [jogo]);

  const sugestao = useMemo(() => {
    if (!mercados.length) return null;
    const validos = mercados.filter((m) => m.melhorOdd != null);
    if (!validos.length) return null;
    return validos.reduce((a, b) => (b.diffPct > a.diffPct ? b : a));
  }, [mercados]);

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
          <div className="max-w-2xl mx-auto pt-10">
            <Card className="p-8 text-center rounded-2xl shadow-soft">
              <Lock className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <h2 className="text-xl font-bold mb-2">Conteúdo Premium</h2>
              <p className="text-sm text-muted-foreground mb-4">Ative um plano para ver os detalhes do jogo.</p>
              <Button className="w-full h-11 rounded-xl" onClick={() => navigate("/planos")}>Ver Planos</Button>
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
        <div className="max-w-2xl mx-auto pt-4 space-y-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/odds")} className="gap-1 -ml-2">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>

          {loading ? (
            <div className="flex justify-center p-10"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : !jogo ? (
            <Card className="p-6 text-center text-muted-foreground rounded-2xl">Jogo não encontrado.</Card>
          ) : (
            <>
              {/* Cabeçalho */}
              <Card className="p-5 rounded-2xl shadow-soft bg-gradient-to-br from-primary/5 to-transparent">
                {jogo.competicao && (
                  <Badge variant="secondary" className="text-[10px] mb-2">{jogo.competicao}</Badge>
                )}
                <div className="flex items-start justify-between gap-3">
                  <h1 className="text-2xl font-bold leading-tight flex-1">
                    {jogo.equipa_casa} <span className="text-muted-foreground text-lg">vs</span> {jogo.equipa_fora}
                  </h1>
                  <Button
                    variant={favorito ? "default" : "outline"}
                    size="icon"
                    className="rounded-full shrink-0 h-10 w-10"
                    onClick={toggleFavorito}
                    disabled={favLoading}
                    aria-label={favorito ? "Remover dos favoritos" : "Salvar nos favoritos"}
                  >
                    <Heart className={`w-5 h-5 ${favorito ? "fill-current" : ""}`} />
                  </Button>
                </div>
                <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(jogo.data_inicio).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(jogo.data_inicio).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="ml-auto">{jogo.odds_casas.length} casa{jogo.odds_casas.length !== 1 ? "s" : ""}</span>
                </div>
              </Card>

              {/* Sugestão destacada */}
              {sugestao && sugestao.diffPct >= 10 && (
                <Card className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30">
                  <div className="flex items-center gap-2 mb-1">
                    <Flame className="w-4 h-4 text-amber-500" />
                    <span className="font-bold text-sm">Melhor Oportunidade</span>
                    <Badge className="ml-auto bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px]">
                      +{sugestao.diffPct.toFixed(0)}%
                    </Badge>
                  </div>
                  <p className="text-sm">
                    Aposta em <strong>{sugestao.label}</strong> na <strong>{sugestao.melhorCasa}</strong> @{" "}
                    <span className="text-amber-600 dark:text-amber-400 font-bold">{sugestao.melhorOdd?.toFixed(2)}</span>
                  </p>
                </Card>
              )}

              {/* Modo Inteligente */}
              <SmartBetMode
                equipaCasa={jogo.equipa_casa}
                equipaFora={jogo.equipa_fora}
                oddsCasas={jogo.odds_casas}
              />

              {/* Análise por mercado */}
              <div className="space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground px-1">Análise por Mercado</h2>
                {mercados.map((m) => (
                  <MercadoCard key={m.key} mercado={m} jogo={jogo} />
                ))}
              </div>

              {/* Tabela completa */}
              <Card className="p-4 rounded-2xl shadow-soft">
                <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3">Odds Finais por Casa</h2>
                {jogo.odds_casas.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">Sem odds disponíveis</p>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-[1.2fr_repeat(3,minmax(0,1fr))] gap-2 text-[10px] uppercase text-muted-foreground font-medium px-1">
                      <span>Casa</span>
                      <span className="text-center truncate">{jogo.equipa_casa}</span>
                      <span className="text-center">Empate</span>
                      <span className="text-center truncate">{jogo.equipa_fora}</span>
                    </div>
                    {jogo.odds_casas.map((o) => (
                      <div key={o.id} className="grid grid-cols-[1.2fr_repeat(3,minmax(0,1fr))] gap-2 items-center bg-muted/30 rounded-lg p-2">
                        <span className="text-sm font-medium truncate">{o.casa_aposta}</span>
                        <OddCell value={o.odd_casa} isBest={mercados[0].melhorCasa === o.casa_aposta && o.odd_casa === mercados[0].melhorOdd} />
                        <OddCell value={o.odd_empate} isBest={mercados[1].melhorCasa === o.casa_aposta && o.odd_empate === mercados[1].melhorOdd} />
                        <OddCell value={o.odd_fora} isBest={mercados[2].melhorCasa === o.casa_aposta && o.odd_fora === mercados[2].melhorOdd} />
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground mt-3 italic">
                  🔥 indica a melhor odd disponível para cada mercado.
                </p>
              </Card>
            </>
          )}
        </div>
      </div>
      <BottomNav />
    </AuthGuard>
  );
}

function MercadoCard({ mercado, jogo }: { mercado: MercadoStats; jogo: Jogo }) {
  if (mercado.total === 0) {
    return (
      <Card className="p-4 rounded-2xl shadow-soft opacity-60">
        <p className="font-semibold text-sm">{mercado.label}</p>
        <p className="text-xs text-muted-foreground mt-1">Sem odds disponíveis para este mercado.</p>
      </Card>
    );
  }

  const field = mercado.key === "casa" ? "odd_casa" : mercado.key === "empate" ? "odd_empate" : "odd_fora";
  const valores = jogo.odds_casas
    .map((o) => ({ casa: o.casa_aposta, val: o[field as keyof OddCasa] as number | null }))
    .filter((v) => v.val != null) as { casa: string; val: number }[];

  return (
    <Card className="p-4 rounded-2xl shadow-soft">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" />
          <p className="font-bold text-sm">{mercado.label}</p>
        </div>
        {mercado.diffPct > 0 && (
          <Badge variant="outline" className={`text-[10px] ${mercado.diffPct >= 25 ? "border-amber-500/40 text-amber-600 dark:text-amber-400" : mercado.diffPct >= 10 ? "border-blue-500/40 text-blue-600 dark:text-blue-400" : ""}`}>
            Δ {mercado.diffPct.toFixed(1)}%
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <Stat label="Melhor" value={mercado.melhorOdd} sub={mercado.melhorCasa} icon={<TrendingUp className="w-3 h-3" />} color="text-emerald-600 dark:text-emerald-400" />
        <Stat label="Média" value={mercado.media} sub={`${mercado.total} casa${mercado.total > 1 ? "s" : ""}`} color="text-foreground" />
        <Stat label="Pior" value={mercado.piorOdd} sub={mercado.piorCasa} icon={<TrendingDown className="w-3 h-3" />} color="text-rose-600 dark:text-rose-400" />
      </div>

      <div className="space-y-1 border-t border-border/50 pt-2">
        {valores
          .sort((a, b) => b.val - a.val)
          .map((v) => {
            const isBest = v.val === mercado.melhorOdd;
            return (
              <div key={v.casa} className="flex items-center justify-between text-xs py-1">
                <span className="text-muted-foreground truncate">{v.casa}</span>
                <span className={`font-semibold flex items-center gap-1 ${isBest ? "text-amber-600 dark:text-amber-400" : ""}`}>
                  {v.val.toFixed(2)} {isBest && <Flame className="w-3 h-3" />}
                </span>
              </div>
            );
          })}
      </div>
    </Card>
  );
}

function Stat({ label, value, sub, icon, color = "text-foreground" }: { label: string; value: number | null; sub?: string | null; icon?: React.ReactNode; color?: string }) {
  return (
    <div className="bg-muted/30 rounded-xl p-2 text-center">
      <p className="text-[9px] uppercase text-muted-foreground font-medium flex items-center justify-center gap-1">{icon}{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value != null ? value.toFixed(2) : "—"}</p>
      {sub && <p className="text-[9px] text-muted-foreground truncate">{sub}</p>}
    </div>
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
