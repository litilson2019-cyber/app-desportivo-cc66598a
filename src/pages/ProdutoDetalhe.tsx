import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthGuard } from "@/components/AuthGuard";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { formatKz } from "@/lib/formatKz";
import { ImageFullscreen } from "@/components/marketplace/ImageFullscreen";
import { Loader2, ArrowLeft, ChevronLeft, ChevronRight, CheckCircle2, Store, ShoppingBag, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShareLinkButton } from "@/components/marketplace/ShareLinkButton";

export default function ProdutoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [produto, setProduto] = useState<any>(null);
  const [imagens, setImagens] = useState<string[]>([]);
  const [loja, setLoja] = useState<any>(null);
  const [outrosProdutos, setOutrosProdutos] = useState<any[]>([]);
  const [currentImg, setCurrentImg] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) loadProduto(id);
  }, [id]);

  const loadProduto = async (produtoId: string) => {
    try {
      const { data: prod } = await supabase
        .from("produtos")
        .select("*")
        .eq("id", produtoId)
        .single();

      if (!prod) { setLoading(false); return; }
      setProduto(prod);

      const { data: imgs } = await supabase
        .from("produto_imagens")
        .select("imagem_url")
        .eq("produto_id", produtoId)
        .order("ordem");
      setImagens((imgs || []).map((i: any) => i.imagem_url));

      const { data: lojaData } = await supabase
        .from("lojas")
        .select("*")
        .eq("id", prod.loja_id)
        .single();
      setLoja(lojaData);

      if (lojaData) {
        const { data: outros } = await supabase
          .from("produtos")
          .select("id, nome, preco, contacto_link")
          .eq("loja_id", lojaData.id)
          .eq("ativo", true)
          .neq("id", produtoId)
          .order("ordem")
          .limit(10);

        const outrosComImgs = [];
        for (const p of outros || []) {
          const { data: pImgs } = await supabase
            .from("produto_imagens")
            .select("imagem_url")
            .eq("produto_id", p.id)
            .order("ordem")
            .limit(1);
          outrosComImgs.push({ ...p, imagem: pImgs?.[0]?.imagem_url || null });
        }
        setOutrosProdutos(outrosComImgs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const scrollProducts = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const amount = 200;
      scrollRef.current.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
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

  if (!produto) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
          <p className="text-muted-foreground">Produto não encontrado</p>
        </div>
        <BottomNav />
      </AuthGuard>
    );
  }

  const imgList = imagens.length > 0 ? imagens : ["https://placehold.co/400x300?text=Sem+Imagem"];
  const descLines = produto.descricao?.split("\n").filter((l: string) => l.trim()) || [];
  const bulletLines = descLines.filter((l: string) => l.startsWith("- ") || l.startsWith("• ") || l.startsWith("✔"));
  const mainDesc = descLines.filter((l: string) => !l.startsWith("- ") && !l.startsWith("• ") && !l.startsWith("✔")).join(" ");

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-subtle pb-20">
        {/* Header */}
        <div className="bg-primary text-primary-foreground px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="flex-shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="font-bold text-sm uppercase tracking-wide truncate">Página de Produto</h1>
              <p className="text-[10px] opacity-80 uppercase">Ver outros produtos da mesma loja</p>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto p-4 space-y-4">
          {/* Product Detail Card */}
          <div className="bg-card rounded-xl shadow-soft p-4">
            <div className="flex gap-4">
              {/* Image */}
              <div className="relative w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-muted cursor-pointer" onClick={() => setFullscreen(true)}>
                <img
                  src={imgList[currentImg]}
                  alt={produto.nome}
                  className="w-full h-full object-cover"
                />
                {imgList.length > 1 && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
                    {imgList.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentImg(i)}
                        className={`w-1.5 h-1.5 rounded-full transition-colors ${i === currentImg ? "bg-primary" : "bg-foreground/30"}`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <h2 className="font-bold text-foreground text-lg leading-tight">{produto.nome}</h2>
                <p className="text-primary font-bold text-base">
                  {produto.preco ? formatKz(produto.preco) : "Sob consulta"}
                </p>
                {mainDesc && (
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{mainDesc}</p>
                )}
                {bulletLines.length > 0 && (
                  <ul className="space-y-0.5">
                    {bulletLines.map((line: string, i: number) => (
                      <li key={i} className="flex items-center gap-1.5 text-xs text-foreground">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        <span>{line.replace(/^[-•✔]\s*/, "")}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-4">
              <Button
                className="flex-1 gap-2 rounded-xl h-11 text-sm font-bold"
                onClick={() => {
                  if (produto.contacto_link) window.open(produto.contacto_link, "_blank");
                  else if (loja?.contacto_whatsapp) window.open(`https://wa.me/${loja.contacto_whatsapp}`, "_blank");
                }}
                disabled={!produto.contacto_link && !loja?.contacto_whatsapp}
              >
                <MessageCircle className="w-4 h-4" />
                Contactar
                <ChevronRight className="w-4 h-4" />
              </Button>
              <ShareLinkButton tipo="produto" itemId={produto.id} itemNome={produto.nome} />
            </div>
          </div>

          {/* Other Products Section */}
          {outrosProdutos.length > 0 && loja && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-foreground text-base">Outros Produtos Desta Loja</h3>
              </div>

              {/* Store Bar */}
              <div
                className="bg-primary/10 rounded-xl p-3 flex items-center justify-between cursor-pointer hover:bg-primary/15 transition-colors"
                onClick={() => navigate(`/loja/${loja.id}`)}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                    {loja.logo_url ? (
                      <img src={loja.logo_url} alt={loja.nome} className="w-full h-full object-cover" />
                    ) : (
                      <Store className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <span className="font-bold text-sm text-foreground">{loja.nome}</span>
                  {loja.verificado && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-0.5">
                      <CheckCircle2 className="w-3 h-3" />
                    </Badge>
                  )}
                </div>
                <span className="text-xs font-semibold text-primary flex items-center gap-0.5">
                  Ver Tudo <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>

              {/* Horizontal Scroll Products */}
              <div className="relative">
                <button
                  onClick={() => scrollProducts("left")}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-background/90 shadow-md flex items-center justify-center hover:bg-background transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-foreground" />
                </button>

                <div
                  ref={scrollRef}
                  className="flex gap-3 overflow-x-auto scrollbar-hide px-6 py-1"
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                  {outrosProdutos.map((p) => (
                    <div
                      key={p.id}
                      className="flex-shrink-0 w-32 cursor-pointer"
                      onClick={() => navigate(`/produto/${p.id}`)}
                    >
                      <div className="w-32 h-28 rounded-lg overflow-hidden bg-muted mb-1.5">
                        <img
                          src={p.imagem || "https://placehold.co/200x150?text=Sem+Img"}
                          alt={p.nome}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <p className="text-xs font-semibold text-foreground truncate">{p.nome}</p>
                      <p className="text-xs font-bold text-primary">
                        {p.preco ? formatKz(p.preco) : "Sob consulta"}
                      </p>
                      <Button
                        size="sm"
                        className="w-full h-7 text-[10px] mt-1 rounded-lg gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (p.contacto_link) window.open(p.contacto_link, "_blank");
                          else if (loja?.contacto_whatsapp) window.open(`https://wa.me/${loja.contacto_whatsapp}`, "_blank");
                        }}
                      >
                        Contactar
                      </Button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => scrollProducts("right")}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-background/90 shadow-md flex items-center justify-center hover:bg-background transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-foreground" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {fullscreen && (
        <ImageFullscreen images={imgList} initialIndex={currentImg} onClose={() => setFullscreen(false)} />
      )}
      <BottomNav />
    </AuthGuard>
  );
}
