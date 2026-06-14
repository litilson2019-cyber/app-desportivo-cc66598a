import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, Shield, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type CategoriaKey = "mais_15" | "mais_25" | "mais_35" | "under";

interface Campeonato {
  bandeira: string;
  nome: string;
}

interface Categoria {
  key: CategoriaKey;
  titulo: string;
  subtitulo: string;
  cor: "green" | "yellow" | "orange" | "blue";
  icon: React.ReactNode;
  campeonatos: Campeonato[];
}

const META: Record<CategoriaKey, Omit<Categoria, "campeonatos" | "key">> = {
  mais_15: {
    titulo: "Mais 1.5",
    subtitulo: "Mais Seguro — Tendência de jogos com pelo menos 2 golos",
    cor: "green",
    icon: <Flame className="w-4 h-4 text-emerald-500" />,
  },
  mais_25: {
    titulo: "Mais 2.5",
    subtitulo: "Bons Mercados — Tendência de jogos com pelo menos 3 golos",
    cor: "yellow",
    icon: <Flame className="w-4 h-4 text-amber-500" />,
  },
  mais_35: {
    titulo: "Mais 3.5",
    subtitulo: "Mais Arriscado — Procurar Jogos Específicos com pelo menos 4 golos",
    cor: "orange",
    icon: <Flame className="w-4 h-4 text-orange-500" />,
  },
  under: {
    titulo: "Perfil Under",
    subtitulo: "Campeonatos com Tendência Mais Defensiva / Poucos Golos",
    cor: "blue",
    icon: <Shield className="w-4 h-4 text-blue-500" />,
  },
};

function corClasses(cor: Categoria["cor"]) {
  switch (cor) {
    case "green":
      return { card: "bg-emerald-500/5 border-emerald-500/20", badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", bar: "bg-emerald-500" };
    case "yellow":
      return { card: "bg-amber-500/5 border-amber-500/20", badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300", bar: "bg-amber-500" };
    case "orange":
      return { card: "bg-orange-500/5 border-orange-500/20", badge: "bg-orange-500/15 text-orange-700 dark:text-orange-300", bar: "bg-orange-500" };
    case "blue":
      return { card: "bg-blue-500/5 border-blue-500/20", badge: "bg-blue-500/15 text-blue-700 dark:text-blue-300", bar: "bg-blue-500" };
  }
}

function CategoriaCard({ categoria }: { categoria: Categoria }) {
  const cores = corClasses(categoria.cor);
  return (
    <Card className={`rounded-2xl border ${cores.card} p-4 space-y-3 shadow-soft`}>
      <div className="flex items-center gap-2">
        <div className={`h-1 w-8 rounded-full ${cores.bar}`} />
        {categoria.icon}
        <h3 className="font-bold text-sm">{categoria.titulo}</h3>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{categoria.subtitulo}</p>
      <div className="flex flex-wrap gap-2">
        {categoria.campeonatos.map((c, idx) => (
          <span key={`${c.nome}-${idx}`} className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full ${cores.badge}`}>
            <span className="text-base leading-none">{c.bandeira}</span>
            <span>{c.nome}</span>
          </span>
        ))}
      </div>
    </Card>
  );
}

export function GoalAnalysisGuide({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Record<CategoriaKey, Campeonato[]>>({ mais_15: [], mais_25: [], mais_35: [], under: [] });

  useEffect(() => {
    (async () => {
      const { data: rows } = await supabase
        .from("guia_campeonatos")
        .select("categoria, bandeira, nome, ordem")
        .order("ordem");
      const grouped: Record<CategoriaKey, Campeonato[]> = { mais_15: [], mais_25: [], mais_35: [], under: [] };
      (rows || []).forEach((r: any) => {
        if (grouped[r.categoria as CategoriaKey]) grouped[r.categoria as CategoriaKey].push({ bandeira: r.bandeira, nome: r.nome });
      });
      setData(grouped);
      setLoading(false);
    })();
  }, []);

  const overKeys: CategoriaKey[] = ["mais_15", "mais_25", "mais_35"];
  const buildCat = (k: CategoriaKey): Categoria => ({ key: k, ...META[k], campeonatos: data[k] });

  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="bottom" className="h-[92dvh] sm:h-[85dvh] rounded-t-3xl border-t border-border/50 flex flex-col p-0">
        <SheetHeader className="px-5 pt-6 pb-4 border-b border-border/50 text-left shrink-0">
          <SheetTitle className="text-lg font-bold flex items-center gap-2">
            <span className="text-2xl">⚽</span>
            Guia de Análise de Golos por Campeonatos
          </SheetTitle>
          <SheetDescription className="text-xs mt-1 leading-relaxed">
            Referência rápida de campeonatos classificados por tendência de golos. Use como apoio na construção dos seus bilhetes.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-500" />
                  <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">
                    Melhores Campeonatos para Procurar Mais
                  </h2>
                </div>
                <div className="space-y-3">
                  {overKeys.map((k) => <CategoriaCard key={k} categoria={buildCat(k)} />)}
                </div>
              </div>

              <div className="h-px bg-border/60" />

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-500" />
                  <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">
                    Campeonatos com Tendência Mais Defensiva / Poucos Golos
                  </h2>
                </div>
                <div className="space-y-3">
                  <CategoriaCard categoria={buildCat("under")} />
                </div>
              </div>

              <div className="text-[11px] text-muted-foreground text-center leading-relaxed pt-2 pb-4">
                Os dados apresentados são baseados em tendências históricas e servem apenas como referência.
                Sempre confirme as estatísticas atualizadas antes de apostar.
              </div>
            </>
          )}
        </div>

        <div className="shrink-0 px-5 pb-6 pt-2 border-t border-border/50 bg-background/80 backdrop-blur-sm">
          <SheetClose asChild>
            <Button className="w-full h-11 rounded-xl font-semibold bg-gradient-primary text-white hover:opacity-90 transition-opacity">
              Fechar Guia
            </Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}
