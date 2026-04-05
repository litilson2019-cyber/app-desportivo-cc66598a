import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Music, MapPin, Phone, BadgeCheck } from "lucide-react";
import { formatKz } from "@/lib/formatKz";
import { useNavigate } from "react-router-dom";

interface Artista {
  id: string;
  nome_artistico: string;
  bio: string | null;
  preco_base_atuacao: number;
  cidade: string | null;
  contacto: string | null;
  tipo: string;
  avatar_url: string | null;
  verificado: boolean;
  produtora_nome?: string | null;
}

export default function Artistas() {
  const navigate = useNavigate();
  const [artistas, setArtistas] = useState<Artista[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");

  useEffect(() => { loadArtistas(); }, []);

  const loadArtistas = async () => {
    try {
      const { data } = await supabase
        .from("artistas")
        .select("id, nome_artistico, bio, preco_base_atuacao, cidade, contacto, tipo, avatar_url, verificado, produtora_id")
        .eq("ativo", true)
        .order("verificado", { ascending: false });

      if (!data) { setLoading(false); return; }

      const enriched: Artista[] = [];
      for (const a of data) {
        let produtora_nome: string | null = null;
        if (a.produtora_id) {
          const { data: prod } = await supabase.from("produtoras").select("nome").eq("id", a.produtora_id).single();
          produtora_nome = prod?.nome || null;
        }
        enriched.push({ ...a, produtora_nome });
      }
      setArtistas(enriched);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const filtered = artistas.filter(a => {
    const matchSearch = a.nome_artistico.toLowerCase().includes(search.toLowerCase()) ||
      (a.cidade || "").toLowerCase().includes(search.toLowerCase());
    const matchTipo = filtroTipo === "todos" || (filtroTipo === "independente" ? a.tipo === "independente" : a.tipo === "gerenciado");
    return matchSearch && matchTipo;
  });

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-subtle pb-20 p-4">
        <div className="max-w-2xl mx-auto pt-6 space-y-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Artistas & Músicos</h1>
            <p className="text-muted-foreground text-sm">Encontre talento para o seu evento</p>
          </div>

          <div className="flex gap-2">
            <Input placeholder="Pesquisar..." value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-xl flex-1" />
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="rounded-xl w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="independente">Independentes</SelectItem>
                <SelectItem value="produtora">Por Produtora</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Music className="w-12 h-12 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">Nenhum artista encontrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((a) => (
                <Card key={a.id} className="p-4 shadow-soft rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                      {a.avatar_url ? <img src={a.avatar_url} alt={a.nome_artistico} className="w-full h-full object-cover" /> : <Music className="w-6 h-6 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-foreground text-sm truncate">{a.nome_artistico}</h3>
                        {a.verificado && <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" />}
                      </div>
                      {a.bio && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{a.bio}</p>}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {a.cidade && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3" /> {a.cidade}
                          </span>
                        )}
                        <span className="text-xs font-semibold text-primary">{formatKz(a.preco_base_atuacao || 0)}</span>
                      </div>
                      {a.produtora_nome && (
                        <p className="text-xs text-muted-foreground mt-1">Gerenciado por: <span className="font-medium text-foreground">{a.produtora_nome}</span></p>
                      )}
                      {a.contacto && (
                        <Button size="sm" variant="outline" className="mt-2 gap-1 rounded-xl text-xs h-7" asChild>
                          <a href={a.contacto.startsWith("http") ? a.contacto : `https://wa.me/${a.contacto.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                            <Phone className="w-3 h-3" /> Contactar
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </AuthGuard>
  );
}
