import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Fundos from "./pages/Fundos";
import Construcao from "./pages/Construcao";
import Menu from "./pages/Menu";
import Seguranca from "./pages/Seguranca";
import Admin from "./pages/Admin";
import Vitrine from "./pages/Vitrine";
import Marketplace from "./pages/Marketplace";
import LojaDetalhe from "./pages/LojaDetalhe";
import MinhaLoja from "./pages/MinhaLoja";
import MeusAnuncios from "./pages/MeusAnuncios";
import MeuPerfilArtista from "./pages/MeuPerfilArtista";
import MinhaProdutora from "./pages/MinhaProdutora";
import Artistas from "./pages/Artistas";
import PlanosComerciais from "./pages/PlanosComerciais";
import ProdutoDetalhe from "./pages/ProdutoDetalhe";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/fundos" element={<Fundos />} />
            <Route path="/construcao" element={<Construcao />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/seguranca" element={<Seguranca />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/vitrine" element={<Vitrine />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/loja/:id" element={<LojaDetalhe />} />
            <Route path="/produto/:id" element={<ProdutoDetalhe />} />
            <Route path="/minha-loja" element={<MinhaLoja />} />
            <Route path="/meus-anuncios" element={<MeusAnuncios />} />
            <Route path="/meu-perfil-artista" element={<MeuPerfilArtista />} />
            <Route path="/minha-produtora" element={<MinhaProdutora />} />
            <Route path="/artistas" element={<Artistas />} />
            <Route path="/planos-comerciais" element={<PlanosComerciais />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
