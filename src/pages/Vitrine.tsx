import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { StoreCard } from "@/components/marketplace/StoreCard";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { Loader2, Store } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Loja {
  id: string;
  nome: string;
  logo_url: string | null;
  bio: string | null;
  verificado: boolean;
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

        lojasComProdutos.push({
          ...loja,
          verificado: loja.verificado ?? false,
          produtos: produtosComImagens,
        });
      }

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
                  <StoreCard
                    id={loja.id}
                    nome={loja.nome}
                    logoUrl={loja.logo_url || undefined}
                    bio={loja.bio || undefined}
                    verificado={loja.verificado}
                  />
                  {loja.produtos.length > 0 && (
                    <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
                      <div className="flex gap-3" style={{ minWidth: "min-content" }}>
                        {loja.produtos.map((prod) => (
                          <div key={prod.id} className="w-[140px] flex-shrink-0">
                            <ProductCard
                              id={prod.id}
                              nome={prod.nome}
                              preco={prod.preco}
                              imagens={prod.imagens}
                              contactoLink={prod.contacto_link || undefined}
                              compact
                            />
                          </div>
                        ))}
                      </div>
                    </div>
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
