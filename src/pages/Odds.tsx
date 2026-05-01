import { useEffect, useMemo, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useUserPlano } from "@/hooks/useUserPlano";
import { useNavigate } from "react-router-dom";
import { Flame, Lock, Loader2, Calendar, Clock, Search, Zap, BarChart3, TrendingUp } from "lucide-react";

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

type Oportunidade = {
  nivel: "alta" | "media" | "baixa" | "nenhuma";
  diffPct: number;
  resultado: "casa" | "empate" | "fora" | null;
  melhorCasa: string | null;
  melhorOdd: number | null;
  piorOdd: number | null;
  equipaSugerida: string | null;
};

const ALTA_THRESHOLD = 25; // % de diferença
const MEDIA_THRESHOLD = 10;

function detectarOportunidade(jogo: Jogo): Oportunidade {
  const empty: Oportunidade = { nivel: "nenhuma", diffPct: 0, resultado: null, melhorCasa: null, melhorOdd: null, piorOdd: null, equipaSugerida: null };
  if (jogo.odds_casas.length < 2) return empty;

  const tipos: Array<{ key: "casa" | "empate" | "fora"; field: keyof OddCasa }> = [
    { key: "casa", field: "odd_casa" },
    { key: "empate", field: "odd_empate" },
    { key: "fora", field: "odd_fora" },
  ];

  let best: Oportunidade = empty;

  for (const t of tipos) {
    const valores = jogo.odds_casas
      .map((o) => ({ casa: o.casa_aposta, val: o[t.field] as number | null }))
      .filter((v) => v.val != null && v.val > 0) as { casa: string; val: number }[];
    if (valores.length < 2) continue;

    const max = valores.reduce((a, b) => (b.val > a.val ? b : a));
    const min = valores.reduce((a, b) => (b.val < a.val ? b : a));
    const diffPct = ((max.val - min.val) / min.val) * 100;

    if (diffPct > best.diffPct) {
      best = {
        nivel: diffPct >= ALTA_THRESHOLD ? "alta" : diffPct >= MEDIA_THRESHOLD ? "media" : "baixa",
        diffPct,
        resultado: t.key,
        melhorCasa: max.casa,
        melhorOdd: max.val,
        piorOdd: min.val,
        equipaSugerida: t.key === "casa" ? jogo.equipa_casa : t.key === "fora" ? jogo.equipa_fora : "Empate",
      };
    }
  }

  return best;
}

export default function Odds() {
  const navigate = useNavigate();
  const { hasActivePlano, loading: loadingPlano } = useUserPlano();
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [search, setSearch] = useState("");
  const [competicaoFiltro, setCompeticaoFiltro] = useState<string>("__all__");
  const [dataFiltro, setDataFiltro] = useState<string>("");

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

  const competicoes = useMemo(() => {
    const set = new Set<string>();
    jogos.forEach((j) => j.competicao && set.add(j.competicao));
    return Array.from(set).sort();
  }, [jogos]);

  const visiveis = useMemo(() => {
    const q = search.trim().toLowerCase();
    return jogos.filter((j) => {
      const inicio = new Date(j.data_inicio).getTime();
      if (now >= inicio + 45 * 60 * 1000) return false;
      if (competicaoFiltro !== "__all__" && j.competicao !== competicaoFiltro) return false;
      if (dataFiltro) {
        const d = new Date(j.data_inicio).toISOString().slice(0, 10);
        if (d !== dataFiltro) return false;
      }
      if (q && !`${j.equipa_casa} ${j.equipa_fora}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [jogos, now, search, competicaoFiltro, dataFiltro]);

  const oportunidades = useMemo(() => {
    return visiveis
      .map((j) => ({ jogo: j, op: detectarOportunidade(j) }))
      .filter((x) => x.op.nivel === "alta" || x.op.nivel === "media")
      .sort((a, b) => b.op.diffPct - a.op.diffPct)
      .slice(0, 3);
  }, [visiveis]);

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

          {/* Oportunidades em destaque */}
          {oportunidades.length > 0 && (
            <Card className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30 shadow-soft">
              <div className="flex items-center gap-2 mb-3">
                <Flame className="w-5 h-5 text-amber-500" />
                <h2 className="font-bold text-sm text-foreground">Oportunidades Detetadas</h2>
              </div>
              <div className="space-y-2">
                {oportunidades.map(({ jogo, op }) => (
                  <div key={jogo.id} className="bg-background/60 rounded-xl p-3 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold">{jogo.equipa_casa} vs {jogo.equipa_fora}</span>
                      <NivelBadge nivel={op.nivel} diffPct={op.diffPct} />
                    </div>
                    <p className="text-muted-foreground">
                      👉 <strong className="text-foreground">{op.equipaSugerida}</strong> na{" "}
                      <strong className="text-foreground">{op.melhorCasa}</strong> @ {op.melhorOdd?.toFixed(2)}
                      <span className="text-muted-foreground"> (vs {op.piorOdd?.toFixed(2)})</span>
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 italic">
                Análise baseada apenas em odds cadastradas. Não garante lucro.
              </p>
            </Card>
          )}

          {/* Filtros */}
          <Card className="p-3 rounded-2xl shadow-soft space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar equipa..."
                className="pl-9 h-9 rounded-xl text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Select value={competicaoFiltro} onValueChange={setCompeticaoFiltro}>
                <SelectTrigger className="h-9 rounded-xl text-xs">
                  <SelectValue placeholder="Competição" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas competições</SelectItem>
                  {competicoes.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={dataFiltro}
                onChange={(e) => setDataFiltro(e.target.value)}
                className="h-9 rounded-xl text-xs"
              />
            </div>
            {(search || competicaoFiltro !== "__all__" || dataFiltro) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs w-full"
                onClick={() => { setSearch(""); setCompeticaoFiltro("__all__"); setDataFiltro(""); }}
              >
                Limpar filtros
              </Button>
            )}
          </Card>

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

function NivelBadge({ nivel, diffPct }: { nivel: Oportunidade["nivel"]; diffPct: number }) {
  if (nivel === "alta")
    return <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] gap-1"><Flame className="w-3 h-3" /> Alta {diffPct.toFixed(0)}%</Badge>;
  if (nivel === "media")
    return <Badge className="bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[10px] gap-1"><Zap className="w-3 h-3" /> Média {diffPct.toFixed(0)}%</Badge>;
  if (nivel === "baixa")
    return <Badge variant="secondary" className="text-[10px] gap-1"><BarChart3 className="w-3 h-3" /> Baixa {diffPct.toFixed(0)}%</Badge>;
  return null;
}

function JogoCard({ jogo }: { jogo: Jogo }) {
  const data = new Date(jogo.data_inicio);
  const dia = data.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
  const hora = data.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
  const op = useMemo(() => detectarOportunidade(jogo), [jogo]);

  const best = useMemo(() => {
    const result = { casa: -Infinity, empate: -Infinity, fora: -Infinity };
    jogo.odds_casas.forEach((o) => {
      if (o.odd_casa && o.odd_casa > result.casa) result.casa = o.odd_casa;
      if (o.odd_empate && o.odd_empate > result.empate) result.empate = o.odd_empate;
      if (o.odd_fora && o.odd_fora > result.fora) result.fora = o.odd_fora;
    });
    return result;
  }, [jogo.odds_casas]);

  const destaque = op.nivel === "alta";

  return (
    <Card className={`p-4 rounded-2xl shadow-soft ${destaque ? "ring-2 ring-amber-500/40" : ""}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base">
            {jogo.equipa_casa} <span className="text-muted-foreground">vs</span> {jogo.equipa_fora}
          </h3>
          <div className="flex flex-wrap gap-1 mt-1">
            {jogo.competicao && <Badge variant="secondary" className="text-[10px]">{jogo.competicao}</Badge>}
            <NivelBadge nivel={op.nivel} diffPct={op.diffPct} />
          </div>
        </div>
        <div className="text-right text-xs text-muted-foreground shrink-0 ml-2">
          <p className="flex items-center gap-1 justify-end"><Calendar className="w-3 h-3" />{dia}</p>
          <p className="flex items-center gap-1 justify-end"><Clock className="w-3 h-3" />{hora}</p>
        </div>
      </div>

      {op.nivel === "alta" || op.nivel === "media" ? (
        <div className="mb-3 p-2 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-500 shrink-0" />
          <span>
            Melhor: <strong>{op.equipaSugerida}</strong> na <strong>{op.melhorCasa}</strong> @ {op.melhorOdd?.toFixed(2)}
          </span>
        </div>
      ) : null}

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
