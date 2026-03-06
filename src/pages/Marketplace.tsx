import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceListingCard } from "@/components/marketplace/MarketplaceListingCard";
import { Loader2, Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

interface Anuncio {
  id: string;
  titulo: string;
  descricao: string | null;
  preco: number;
  localizacao: string | null;
  categoria: string;
  contacto_link: string | null;
  imagens: string[];
}

const categorias = [
  { value: "todos", label: "Todas Categorias" },
  { value: "imoveis", label: "Imóveis" },
  { value: "veiculos", label: "Veículos" },
  { value: "eletronicos", label: "Eletrónicos / Tecnologia" },
  { value: "outros", label: "Outros" },
];

export default function Marketplace() {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoria, setCategoria] = useState("todos");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [precoOrdem, setPrecoOrdem] = useState("recente");

  useEffect(() => {
    loadAnuncios();
  }, []);

  const loadAnuncios = async () => {
    try {
      const { data } = await supabase
        .from("anuncios_marketplace")
        .select("id, titulo, descricao, preco, localizacao, categoria, contacto_link")
        .eq("ativo", true)
        .order("created_at", { ascending: false });

      if (!data) { setLoading(false); return; }

      const anunciosComImagens: Anuncio[] = [];
      for (const a of data) {
        const { data: imgs } = await supabase
          .from("anuncio_imagens")
          .select("imagem_url")
          .eq("anuncio_id", a.id)
          .order("ordem");
        anunciosComImagens.push({
          ...a,
          imagens: (imgs || []).map((i: any) => i.imagem_url),
        });
      }
      setAnuncios(anunciosComImagens);
    } catch (err) {
      console.error("Erro ao carregar marketplace:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = anuncios
    .filter((a) => {
      const matchSearch =
        a.titulo.toLowerCase().includes(search.toLowerCase()) ||
        (a.descricao || "").toLowerCase().includes(search.toLowerCase()) ||
        (a.localizacao || "").toLowerCase().includes(search.toLowerCase());
      const matchCat = categoria === "todos" || a.categoria === categoria;
      return matchSearch && matchCat;
    })
    .sort((a, b) => {
      if (precoOrdem === "menor") return a.preco - b.preco;
      if (precoOrdem === "maior") return b.preco - a.preco;
      return 0;
    });

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-subtle pb-20 p-4">
        <div className="max-w-2xl mx-auto pt-6 space-y-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Mercado & Serviços</h1>
            <p className="text-muted-foreground text-sm">Encontre o que procura</p>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 rounded-xl"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              className="rounded-xl flex-shrink-0"
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </Button>
          </div>

          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <CollapsibleContent>
              <div className="flex gap-2 pb-2">
                <Select value={categoria} onValueChange={setCategoria}>
                  <SelectTrigger className="rounded-xl flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={precoOrdem} onValueChange={setPrecoOrdem}>
                  <SelectTrigger className="rounded-xl flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recente">Mais Recente</SelectItem>
                    <SelectItem value="menor">Menor Preço</SelectItem>
                    <SelectItem value="maior">Maior Preço</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Search className="w-12 h-12 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">Nenhum anúncio encontrado</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filtered.map((a) => (
                <MarketplaceListingCard
                  key={a.id}
                  titulo={a.titulo}
                  descricao={a.descricao || undefined}
                  preco={a.preco}
                  localizacao={a.localizacao || undefined}
                  categoria={a.categoria}
                  imagens={a.imagens}
                  contactoLink={a.contacto_link || undefined}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </AuthGuard>
  );
}
