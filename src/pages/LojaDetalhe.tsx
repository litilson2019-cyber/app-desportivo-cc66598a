import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AuthGuard } from "@/components/AuthGuard";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Store, CheckCircle2, MessageCircle, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ShareLinkButton } from "@/components/marketplace/ShareLinkButton";

export default function LojaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loja, setLoja] = useState<any>(null);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadLoja(id);
  }, [id]);

  const loadLoja = async (lojaId: string) => {
    try {
      const { data: lojaData } = await supabase
        .from("lojas")
        .select("*")
        .eq("id", lojaId)
        .single();

      setLoja(lojaData);

      const { data: prods } = await supabase
        .from("produtos")
        .select("id, nome, descricao, preco, contacto_link")
        .eq("loja_id", lojaId)
        .eq("ativo", true)
        .order("ordem");

      const prodsComImgs = [];
      for (const p of prods || []) {
        const { data: imgs } = await supabase
          .from("produto_imagens")
          .select("imagem_url")
          .eq("produto_id", p.id)
          .order("ordem");
        prodsComImgs.push({ ...p, imagens: (imgs || []).map((i: any) => i.imagem_url) });
      }
      setProdutos(prodsComImgs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        <BottomNav />
      </AuthGuard>
    );
  }

  if (!loja) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
          <p className="text-muted-foreground">Loja não encontrada</p>
        </div>
        <BottomNav />
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-subtle pb-20 p-4">
        <div className="max-w-2xl mx-auto pt-6 space-y-6">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
              {loja.logo_url ? (
                <img src={loja.logo_url} alt={loja.nome} className="w-full h-full object-cover" />
              ) : (
                <Store className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">{loja.nome}</h1>
                {loja.verificado && (
                  <Badge variant="secondary" className="gap-0.5">
                    <CheckCircle2 className="w-3 h-3" /> Verificado
                  </Badge>
                )}
              </div>
              {loja.bio && <p className="text-sm text-muted-foreground mt-1">{loja.bio}</p>}
            </div>
          </div>

          {loja.contacto_whatsapp && (
            <Button
              className="w-full gap-2 rounded-xl"
              onClick={() => window.open(`https://wa.me/${loja.contacto_whatsapp}`, "_blank")}
            >
              <MessageCircle className="w-4 h-4" /> Contactar via WhatsApp
            </Button>
          )}

          <div>
            <h2 className="text-lg font-bold text-foreground mb-3">Produtos ({produtos.length})</h2>
            {produtos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem produtos publicados</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {produtos.map((p) => (
                  <ProductCard
                    key={p.id}
                    id={p.id}
                    nome={p.nome}
                    descricao={p.descricao || undefined}
                    preco={p.preco}
                    imagens={p.imagens}
                    contactoLink={p.contacto_link || undefined}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <BottomNav />
    </AuthGuard>
  );
}
