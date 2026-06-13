import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Flame, Shield } from "lucide-react";

interface Campeonato {
  bandeira: string;
  nome: string;
}

interface Categoria {
  titulo: string;
  subtitulo: string;
  cor: "green" | "yellow" | "orange" | "blue";
  icon: React.ReactNode;
  campeonatos: Campeonato[];
}

const CATEGORIAS: Categoria[] = [
  {
    titulo: "Over 1.5",
    subtitulo: "Mais Seguro — Tendência de jogos com pelo menos 2 golos",
    cor: "green",
    icon: <Flame className="w-4 h-4 text-emerald-500" />,
    campeonatos: [
      { bandeira: "🇬🇧", nome: "Inglaterra" },
      { bandeira: "🇦🇺", nome: "Austrália" },
      { bandeira: "🇩🇰", nome: "Dinamarca" },
      { bandeira: "🇫🇮", nome: "Finlândia" },
      { bandeira: "🇮🇸", nome: "Islândia" },
      { bandeira: "🇳🇴", nome: "Noruega" },
      { bandeira: "🇸🇪", nome: "Suécia" },
      { bandeira: "🇺🇸", nome: "EUA" },
      { bandeira: "🏴", nome: "Escócia" },
      { bandeira: "🇮🇪", nome: "República da Irlanda" },
    ],
  },
  {
    titulo: "Over 2.5",
    subtitulo: "Bons Mercados — Tendência de jogos com pelo menos 3 golos",
    cor: "yellow",
    icon: <Flame className="w-4 h-4 text-amber-500" />,
    campeonatos: [
      { bandeira: "🇬🇧", nome: "Inglaterra" },
      { bandeira: "🇦🇺", nome: "Austrália" },
      { bandeira: "🇩🇰", nome: "Dinamarca" },
      { bandeira: "🇫🇮", nome: "Finlândia" },
      { bandeira: "🇮🇸", nome: "Islândia" },
      { bandeira: "🇳🇴", nome: "Noruega" },
      { bandeira: "🇸🇪", nome: "Suécia" },
      { bandeira: "🇺🇸", nome: "EUA" },
      { bandeira: "🏴", nome: "Escócia" },
    ],
  },
  {
    titulo: "Over 3.5",
    subtitulo: "Mais Arriscado — Procurar Jogos Específicos com pelo menos 4 golos",
    cor: "orange",
    icon: <Flame className="w-4 h-4 text-orange-500" />,
    campeonatos: [
      { bandeira: "🇬🇧", nome: "Inglaterra" },
      { bandeira: "🇦🇺", nome: "Austrália" },
      { bandeira: "🇩🇰", nome: "Dinamarca" },
      { bandeira: "🇫🇮", nome: "Finlândia" },
      { bandeira: "🇮🇸", nome: "Islândia" },
      { bandeira: "🇳🇴", nome: "Noruega" },
      { bandeira: "🇸🇪", nome: "Suécia" },
    ],
  },
];

const CATEGORIAS_UNDER: Categoria[] = [
  {
    titulo: "Perfil Under",
    subtitulo: "Campeonatos com Tendência Mais Defensiva / Poucos Golos",
    cor: "blue",
    icon: <Shield className="w-4 h-4 text-blue-500" />,
    campeonatos: [
      { bandeira: "🇦🇷", nome: "Primera División Argentina" },
      { bandeira: "🇨🇴", nome: "Primera A Colômbia" },
      { bandeira: "🇺🇾", nome: "Primera División Uruguai" },
      { bandeira: "🇨🇱", nome: "Primera División Chile" },
      { bandeira: "🇵🇪", nome: "Liga 1 Peru" },
      { bandeira: "🇲🇦", nome: "Botola Pro Marrocos" },
      { bandeira: "🇮🇹", nome: "Serie A Itália" },
      { bandeira: "🇪🇸", nome: "La Liga Espanha" },
      { bandeira: "🇯🇵", nome: "J1 League Japão" },
      { bandeira: "🇨🇳", nome: "Super League China" },
      { bandeira: "🇷🇺", nome: "Premier League Rússia" },
      { bandeira: "🇰🇿", nome: "Premier League Cazaquistão" },
      { bandeira: "🇰🇪", nome: "Kenyan Premier League" },
      { bandeira: "🇿🇼", nome: "Premier Soccer League Zimbabué" },
      { bandeira: "🇦🇴", nome: "Girabola Angola" },
      { bandeira: "🇨🇬", nome: "Ligue 1 Congo" },
    ],
  },
];

function corClasses(cor: Categoria["cor"]) {
  switch (cor) {
    case "green":
      return {
        card: "bg-emerald-500/5 border-emerald-500/20",
        badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
        bar: "bg-emerald-500",
      };
    case "yellow":
      return {
        card: "bg-amber-500/5 border-amber-500/20",
        badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
        bar: "bg-amber-500",
      };
    case "orange":
      return {
        card: "bg-orange-500/5 border-orange-500/20",
        badge: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
        bar: "bg-orange-500",
      };
    case "blue":
      return {
        card: "bg-blue-500/5 border-blue-500/20",
        badge: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
        bar: "bg-blue-500",
      };
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
        {categoria.campeonatos.map((c) => (
          <span
            key={c.nome}
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full ${cores.badge}`}
          >
            <span className="text-base leading-none">{c.bandeira}</span>
            <span>{c.nome}</span>
          </span>
        ))}
      </div>
    </Card>
  );
}

export function GoalAnalysisGuide({ children }: { children: React.ReactNode }) {
  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent
        side="bottom"
        className="h-[92dvh] sm:h-[85dvh] rounded-t-3xl border-t border-border/50 flex flex-col p-0"
      >
        {/* Header fixo */}
        <SheetHeader className="px-5 pt-6 pb-4 border-b border-border/50 text-left shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <SheetTitle className="text-lg font-bold flex items-center gap-2">
                <span className="text-2xl">⚽</span>
                Guia de Análise de Golos por Campeonatos
              </SheetTitle>
              <SheetDescription className="text-xs mt-1 leading-relaxed">
                Referência rápida de campeonatos classificados por tendência de golos. Use como apoio na construção dos seus bilhetes.
              </SheetDescription>
            </div>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 shrink-0 -mt-1 -mr-2">
                <X className="w-4 h-4" />
                <span className="sr-only">Fechar</span>
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>

        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {/* Seção Over */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-500" />
              <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">
                Melhores Campeonatos para Procurar Over
              </h2>
            </div>
            <div className="space-y-3">
              {CATEGORIAS.map((cat) => (
                <CategoriaCard key={cat.titulo} categoria={cat} />
              ))}
            </div>
          </div>

          {/* Divisor */}
          <div className="h-px bg-border/60" />

          {/* Seção Under */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-500" />
              <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">
                Campeonatos com Tendência Mais Defensiva / Poucos Golos
              </h2>
            </div>
            <div className="space-y-3">
              {CATEGORIAS_UNDER.map((cat) => (
                <CategoriaCard key={cat.titulo} categoria={cat} />
              ))}
            </div>
          </div>

          {/* Rodapé informativo */}
          <div className="text-[11px] text-muted-foreground text-center leading-relaxed pt-2 pb-4">
            Os dados apresentados são baseados em tendências históricas e servem apenas como referência.
            Sempre confirme as estatísticas atualizadas antes de apostar.
          </div>
        </div>

        {/* Botão fixo de fechar na parte inferior */}
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
