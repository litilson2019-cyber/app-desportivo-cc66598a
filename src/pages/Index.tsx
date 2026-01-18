import { useEffect, useState, useRef } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Loader2, TrendingUp, Shield, Zap, Eye, Wallet, FileText, Target, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { useNavigate } from "react-router-dom";
import Autoplay from "embla-carousel-autoplay";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function Index() {
  const [avisoAberto, setAvisoAberto] = useState(false);
  const [nome, setNome] = useState("Investidor");
  const navigate = useNavigate();
  const autoplayPlugin = useRef(
    Autoplay({ delay: 3000, stopOnInteraction: true })
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("nome_completo")
        .eq("id", user.id)
        .single();

      if (profile) {
        setNome(profile.nome_completo || "Investidor");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const bannerImages = [
    "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=800&q=80"
  ];

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-subtle pb-20 p-4">
        <div className="max-w-2xl mx-auto pt-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Olá, {nome}!</h1>
            <p className="text-muted-foreground">
              👋 Bem-vindo à Sua Plataforma Exclusiva
            </p>
          </div>

          {/* Aviso Fixo Recolhível */}
          <Collapsible open={avisoAberto} onOpenChange={setAvisoAberto}>
            <Card className="bg-amber-500/10 border-amber-500/30 rounded-xl overflow-hidden">
              <CollapsibleTrigger className="w-full p-2 flex items-center justify-center gap-2 hover:bg-amber-500/5 transition-colors">
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                <span className="text-xs text-amber-300 font-medium">Aviso Importante</span>
                {avisoAberto ? (
                  <ChevronUp className="w-3 h-3 text-amber-400" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-amber-400" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-3 pb-3">
                  <p className="text-xs text-amber-300/80 text-center">
                    Este aplicativo não possui planos nem permite levantamentos. Todo o saldo, incluindo bónus, é apenas para uso interno.
                  </p>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          <Carousel
            opts={{ loop: true }}
            plugins={[autoplayPlugin.current]}
            className="w-full"
          >
            <CarouselContent>
              {bannerImages.map((image, index) => (
                <CarouselItem key={index}>
                  <Card className="overflow-hidden shadow-soft rounded-2xl border-0">
                    <div className="aspect-video w-full">
                      <img 
                        src={image} 
                        alt={`Banner ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>

          <div>
            <h2 className="text-xl font-bold text-foreground mb-4">Recursos Principais</h2>
            <div className="space-y-3">
              <Card className="p-4 shadow-soft rounded-xl">
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold text-foreground">📈 Palpites Inteligentes</h3>
                    <p className="text-sm text-muted-foreground">
                      Receba análises automáticas com base nas melhores probabilidades do momento.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 shadow-soft rounded-xl">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold text-foreground">🛡 Modo Seguro</h3>
                    <p className="text-sm text-muted-foreground">
                      Recomendações equilibradas com foco em estabilidade.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 shadow-soft rounded-xl">
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold text-foreground">⚡ Modo Arriscado</h3>
                    <p className="text-sm text-muted-foreground">
                      Sugestões com maior potencial e bilhetes mais longos para quem busca ousadia.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          <Card className="p-4 shadow-soft rounded-xl bg-primary/5">
            <h3 className="font-semibold text-foreground mb-2">💬 Dica Rápida</h3>
            <p className="text-sm text-muted-foreground">
              Use o menu abaixo para navegar. Tudo foi organizado para facilitar a tua experiência.
            </p>
          </Card>

          <div>
            <h2 className="text-xl font-bold text-foreground mb-4">Qual é o teu objetivo hoje?</h2>
            <div className="grid grid-cols-2 gap-3">
              <Card 
                className="p-4 shadow-soft rounded-xl cursor-pointer hover:bg-accent transition-colors"
                onClick={() => navigate("/construcao")}
              >
                <Eye className="w-6 h-6 text-primary mb-2" />
                <p className="text-sm font-semibold text-foreground">Ver novas previsões</p>
              </Card>

              <Card 
                className="p-4 shadow-soft rounded-xl cursor-pointer hover:bg-accent transition-colors"
                onClick={() => navigate("/fundos")}
              >
                <Wallet className="w-6 h-6 text-primary mb-2" />
                <p className="text-sm font-semibold text-foreground">Consultar meus fundos</p>
              </Card>

              <Card 
                className="p-4 shadow-soft rounded-xl cursor-pointer hover:bg-accent transition-colors"
                onClick={() => navigate("/menu")}
              >
                <FileText className="w-6 h-6 text-primary mb-2" />
                <p className="text-sm font-semibold text-foreground">Analisar bilhetes anteriores</p>
              </Card>

              <Card 
                className="p-4 shadow-soft rounded-xl cursor-pointer hover:bg-accent transition-colors"
                onClick={() => navigate("/construcao")}
              >
                <Target className="w-6 h-6 text-primary mb-2" />
                <p className="text-sm font-semibold text-foreground">Explorar oportunidades</p>
              </Card>
            </div>
          </div>

          <Card className="p-4 shadow-soft rounded-xl">
            <h3 className="font-semibold text-foreground mb-3">📊 Painel de Desempenho</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Última atualização:</span>
                <span className="text-foreground font-medium">Hoje</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Modos disponíveis:</span>
                <span className="text-foreground font-medium">Seguro e Arriscado</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Banners:</span>
                <span className="text-foreground font-medium">Carregando…</span>
              </div>
            </div>
          </Card>

          <Card className="p-4 shadow-soft rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10">
            <p className="text-sm text-center text-foreground">
              🎉 Novidades em breve! Fica atento às campanhas, promoções e oportunidades que vão aparecer aqui.
            </p>
          </Card>
        </div>
      </div>
      <BottomNav />
    </AuthGuard>
  );
}
