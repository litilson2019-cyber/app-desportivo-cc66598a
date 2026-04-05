import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { StoreCard } from "@/components/marketplace/StoreCard";
import { ProductCarousel } from "@/components/marketplace/ProductCarousel";
import { Loader2, Store } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Loja {
  id: string;
  nome: string;
  logo_url: string | null;
  bio: string | null;
  verificado: boolean;
  prioridade: number;
  destacado: boolean;
  produtos: {
    id: string;
    nome: string;
    descricao: string | null;
    preco: number;
    contacto_link: string | null;
    imagens: string[];
  }[];
}

export default function Vitrine() {
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadLojas();
  }, []);

  const loadLojas = async () => {
    try {
      const { data: lojasData } = await supabase
        .from("lojas")
        .select("id, nome, logo_url, bio, verificado")
        .eq("ativo", true)
        .order("verificado", { ascending: false });

      if (!lojasData) { setLoading(false); return; }

      // Load active highlights to determine priority
      const now = new Date().toISOString();
      const { data: destaques } = await supabase
        .from("destaques_vitrine")
        .select("loja_id, prioridade")
        .eq("ativo", true)
        .gte("data_fim", now)
        .lte("data_inicio", now);

      // Build priority map: highest priority per store
      const prioridadeMap: Record<string, number> = {};
      for (const d of destaques || []) {
        const lojaId = (d as any).loja_id;
        const prio = Number((d as any).prioridade) || 0;
        prioridadeMap[lojaId] = Math.max(prioridadeMap[lojaId] || 0, prio);
      }

      const lojasComProdutos: Loja[] = [];

      for (const loja of lojasData) {
        const { data: produtos } = await supabase
          .from("produtos")
          .select("id, nome, descricao, preco, contacto_link")
          .eq("loja_id", loja.id)
          .eq("ativo", true)
          .order("ordem");

        const produtosComImagens = [];
        for (const prod of produtos || []) {
          const { data: imgs } = await supabase
            .from("produto_imagens")
            .select("imagem_url")
            .eq("produto_id", prod.id)
            .order("ordem");
          produtosComImagens.push({
            ...prod,
            imagens: (imgs || []).map((i: any) => i.imagem_url),
          });
        }

        const prio = prioridadeMap[loja.id] || 0;
        lojasComProdutos.push({
          ...loja,
          verificado: loja.verificado ?? false,
          prioridade: prio,
          destacado: prio > 0,
          produtos: produtosComImagens,
        });
      }

      // Sort: highlighted first (by priority desc), then verified, then rest
      lojasComProdutos.sort((a, b) => {
        if (a.prioridade !== b.prioridade) return b.prioridade - a.prioridade;
        if (a.verificado !== b.verificado) return a.verificado ? -1 : 1;
        return 0;
      });

      setLojas(lojasComProdutos);
    } catch (err) {
      console.error("Erro ao carregar vitrine:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = lojas.filter(
    (l) =>
      l.nome.toLowerCase().includes(search.toLowerCase()) ||
      l.produtos.some((p) => p.nome.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-subtle pb-20 p-4">
        <div className="max-w-2xl mx-auto pt-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Vitrine Oficial</h1>
            <p className="text-muted-foreground text-sm">Lojas e produtos dos nossos parceiros</p>
          </div>

          <Input
            placeholder="Pesquisar lojas ou produtos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl"
          />

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Store className="w-12 h-12 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">Nenhuma loja encontrada</p>
            </div>
          ) : (
            <div className="space-y-6">
              {filtered.map((loja) => (
                <div key={loja.id} className="space-y-3">
                  <div className="relative">
                    {loja.destacado && (
                      <Badge className="absolute -top-2 right-2 z-10 text-[10px] bg-amber-500 hover:bg-amber-600 gap-1">
                        ⭐ Destaque
                      </Badge>
                    )}
                    <StoreCard
                      id={loja.id}
                      nome={loja.nome}
                      logoUrl={loja.logo_url || undefined}
                      bio={loja.bio || undefined}
                      verificado={loja.verificado}
                    />
                  </div>
                  {loja.produtos.length > 0 && (
                    <ProductCarousel produtos={loja.produtos} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </AuthGuard>
  );
}
