import { useEffect, useState, useRef, useCallback } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft, Music, BadgeCheck, MessageCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { formatKz } from "@/lib/formatKz";
import { ArtistaGaleriaDisplay } from "@/components/artista/ArtistaGaleriaDisplay";
import { ArtistaAvaliacoes } from "@/components/artista/ArtistaAvaliacoes";

interface Produto {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  contacto_link: string | null;
  imagens: string[];
}

interface ArtistaData {
  id: string;
  nome_artistico: string;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  preco_base_atuacao: number;
  preco_album: number;
  cidade: string | null;
  contacto: string | null;
  verificado: boolean;
  tipo: string;
  user_id: string;
  produtora_nome?: string | null;
}

const KZ_TO_USDT = 0.00098; // approximate rate

export default function ArtistaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [artista, setArtista] = useState<ArtistaData | null>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    if (id) loadArtista();
  }, [id]);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  const scroll = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 180, behavior: "smooth" });
  };

  const loadArtista = async () => {
    try {
      const { data: a } = await supabase
        .from("artistas")
        .select("id, nome_artistico, bio, avatar_url, banner_url, preco_base_atuacao, preco_album, cidade, contacto, verificado, tipo, user_id, produtora_id")
        .eq("id", id!)
        .single();

      if (!a) { setLoading(false); return; }

      let produtora_nome: string | null = null;
      if (a.produtora_id) {
        const { data: prod } = await supabase.from("produtoras").select("nome").eq("id", a.produtora_id).single();
        produtora_nome = prod?.nome || null;
      }

      setArtista({ ...a, produtora_nome });

      // Load products from the artist's store (same user_id)
      const { data: lojaData } = await supabase
        .from("lojas")
        .select("id")
        .eq("user_id", a.user_id)
        .eq("ativo", true)
        .single();

      if (lojaData) {
        const { data: prods } = await supabase
          .from("produtos")
          .select("id, nome, descricao, preco, contacto_link")
          .eq("loja_id", lojaData.id)
          .eq("ativo", true)
          .order("ordem");

        const produtosComImagens: Produto[] = [];
        for (const p of prods || []) {
          const { data: imgs } = await supabase
            .from("produto_imagens")
            .select("imagem_url")
            .eq("produto_id", p.id)
            .order("ordem");
          produtosComImagens.push({
            ...p,
            imagens: (imgs || []).map((i: any) => i.imagem_url),
          });
        }
        setProdutos(produtosComImagens);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getWhatsappLink = (contacto: string) => {
    if (contacto.startsWith("http")) return contacto;
    return `https://wa.me/${contacto.replace(/\D/g, "")}`;
  };

  const formatUsdt = (kz: number) => `~${(kz * KZ_TO_USDT).toFixed(2)} USDT`;

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

  if (!artista) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
          <div className="text-center space-y-3">
            <Music className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">Artista não encontrado</p>
            <Button onClick={() => navigate("/artistas")} className="rounded-xl">Voltar</Button>
          </div>
        </div>
        <BottomNav />
      </AuthGuard>
    );
  }

  // Split products: first 3 as featured, rest in carousel
  const featuredProducts = produtos.slice(0, 3);
  const otherProducts = produtos.slice(3);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background pb-20">
        {/* Hero Banner */}
        <div className="relative">
          <div className="h-48 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 relative overflow-hidden">
            {(artista.banner_url || artista.avatar_url) && (
              <img
                src={artista.banner_url || artista.avatar_url!}
                alt=""
                className="w-full h-full object-cover opacity-60"
              />
            )}
            {/* Back button */}
            <button
              onClick={() => navigate(-1)}
              className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white z-10"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>

          {/* Avatar overlapping banner */}
          <div className="absolute -bottom-12 left-6">
            <div className="w-24 h-24 rounded-full border-4 border-background bg-muted flex items-center justify-center overflow-hidden shadow-lg">
              {artista.avatar_url ? (
                <img src={artista.avatar_url} alt={artista.nome_artistico} className="w-full h-full object-cover" />
              ) : (
                <Music className="w-10 h-10 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>

        {/* Artist Info */}
        <div className="px-4 pt-16 pb-4 space-y-3">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">{artista.nome_artistico}</h1>
            {artista.verificado && <BadgeCheck className="w-5 h-5 text-primary" />}
          </div>

          {artista.bio && (
            <p className="text-sm text-muted-foreground leading-relaxed">{artista.bio}</p>
          )}

          {artista.produtora_nome && (
            <p className="text-xs text-muted-foreground">
              Gerenciado por: <span className="font-semibold text-foreground">{artista.produtora_nome}</span>
            </p>
          )}

          {/* WhatsApp CTA */}
          {artista.contacto && (
            <Button
              className="rounded-xl gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold"
              asChild
            >
              <a href={getWhatsappLink(artista.contacto)} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-5 h-5" />
                Contactar / Contratar
              </a>
            </Button>
          )}
        </div>

        {/* Galeria de Fotos & Vídeos */}
        <ArtistaGaleriaDisplay artistaId={artista.id} />

        {/* Álbuns & Produtos - Featured Grid */}
        {featuredProducts.length > 0 && (
          <div className="px-4 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Music className="w-5 h-5 text-primary" />
                Álbuns & Produtos
              </h2>
              {produtos.length > 3 && (
                <button
                  onClick={() => {/* scroll to others */}}
                  className="text-sm text-primary font-semibold"
                >
                  Ver Tudo &gt;
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {featuredProducts.map((p) => (
                <div
                  key={p.id}
                  className="bg-card rounded-xl border border-border overflow-hidden shadow-soft cursor-pointer"
                  onClick={() => navigate(`/produto/${p.id}`)}
                >
                  <div className="aspect-square bg-muted overflow-hidden">
                    {p.imagens[0] ? (
                      <img src={p.imagens[0]} alt={p.nome} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="p-2 space-y-1">
                    <p className="text-xs font-semibold text-foreground truncate">{p.nome}</p>
                    <p className="text-xs font-bold text-primary">{formatKz(p.preco || 0)}</p>
                    <p className="text-[10px] text-muted-foreground">{formatUsdt(p.preco || 0)}</p>
                    {p.contacto_link ? (
                      <a
                        href={p.contacto_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="block mt-1"
                      >
                        <Button size="sm" className="w-full h-6 text-[10px] rounded-lg bg-primary hover:bg-primary/90">
                          Contactar &gt;
                        </Button>
                      </a>
                    ) : (
                      <Button size="sm" className="w-full h-6 text-[10px] rounded-lg bg-orange-500 hover:bg-orange-600 text-white">
                        Comprar &gt;
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Outros Produtos - Horizontal Carousel */}
        {otherProducts.length > 0 && (
          <div className="px-4 py-4 space-y-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="text-primary">📡</span>
              Outros Produtos
            </h2>

            <div className="relative">
              {canScrollLeft && (
                <button
                  onClick={() => scroll(-1)}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-background/90 border border-border shadow-md flex items-center justify-center"
                >
                  <ChevronLeft className="w-4 h-4 text-foreground" />
                </button>
              )}

              <div
                ref={scrollRef}
                onScroll={checkScroll}
                className="flex gap-2 overflow-x-auto scrollbar-hide pb-2"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {otherProducts.map((p) => (
                  <div
                    key={p.id}
                    className="flex-shrink-0 w-[140px] bg-card rounded-xl border border-border overflow-hidden shadow-soft cursor-pointer"
                    onClick={() => navigate(`/produto/${p.id}`)}
                  >
                    <div className="aspect-square bg-muted overflow-hidden">
                      {p.imagens[0] ? (
                        <img src={p.imagens[0]} alt={p.nome} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="p-2 space-y-1">
                      <p className="text-xs font-semibold text-foreground truncate">{p.nome}</p>
                      <p className="text-xs font-bold text-primary">{formatKz(p.preco || 0)}</p>
                      <p className="text-[10px] text-muted-foreground">{formatUsdt(p.preco || 0)}</p>
                      {p.contacto_link ? (
                        <a
                          href={p.contacto_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="block mt-1"
                        >
                          <Button size="sm" className="w-full h-6 text-[10px] rounded-lg bg-primary hover:bg-primary/90">
                            Contactar &gt;
                          </Button>
                        </a>
                      ) : (
                        <Button size="sm" className="w-full h-6 text-[10px] rounded-lg bg-orange-500 hover:bg-orange-600 text-white">
                          Comprar &gt;
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {canScrollRight && (
                <button
                  onClick={() => scroll(1)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-background/90 border border-border shadow-md flex items-center justify-center"
                >
                  <ChevronRight className="w-4 h-4 text-foreground" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Ofertas Exclusivas */}
        {produtos.length > 0 && (
          <div className="px-4 py-4 space-y-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              🔥 Ofertas Exclusivas
            </h2>
            <div className="rounded-2xl overflow-hidden bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 p-[2px]">
              <div className="bg-card rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">🎵</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground text-sm">Promoção Especial</p>
                    <p className="text-xs text-muted-foreground">Álbuns e serviços com desconto exclusivo deste artista</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {artista.preco_album > 0 && (
                    <div className="bg-muted/50 rounded-xl p-3 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Álbum</p>
                      <p className="text-sm font-bold text-primary">{formatKz(artista.preco_album)}</p>
                      <p className="text-[10px] text-muted-foreground">{formatUsdt(artista.preco_album)}</p>
                    </div>
                  )}
                  {artista.preco_base_atuacao > 0 && (
                    <div className="bg-muted/50 rounded-xl p-3 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Atuação</p>
                      <p className="text-sm font-bold text-primary">{formatKz(artista.preco_base_atuacao)}</p>
                      <p className="text-[10px] text-muted-foreground">{formatUsdt(artista.preco_base_atuacao)}</p>
                    </div>
                  )}
                </div>
                {artista.contacto && (
                  <a
                    href={getWhatsappLink(artista.contacto)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button className="w-full rounded-xl gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold">
                      <MessageCircle className="w-4 h-4" />
                      Aproveitar Oferta
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Empty state if no products */}
        {produtos.length === 0 && (
          <div className="px-4 py-8 text-center">
            <Music className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Este artista ainda não tem produtos disponíveis</p>
          </div>
        )}

        {/* Avaliações e Comentários */}
        <ArtistaAvaliacoes artistaId={artista.id} />
      </div>
      <BottomNav />
    </AuthGuard>
  );
}
