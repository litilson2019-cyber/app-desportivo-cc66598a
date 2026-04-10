import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Image as ImageIcon, Film, X, ChevronLeft, ChevronRight } from "lucide-react";

interface GaleriaItem {
  id: string;
  tipo: string;
  url: string;
  titulo: string | null;
  ordem: number;
}

function getYoutubeEmbedUrl(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

function getInstagramEmbedUrl(url: string): string | null {
  const match = url.match(/instagram\.com\/(p|reel)\/([a-zA-Z0-9_-]+)/);
  return match ? `https://www.instagram.com/${match[1]}/${match[2]}/embed` : null;
}

export function ArtistaGaleriaDisplay({ artistaId }: { artistaId: string }) {
  const [items, setItems] = useState<GaleriaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fullscreenIdx, setFullscreenIdx] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from("artista_galeria")
      .select("*")
      .eq("artista_id", artistaId)
      .order("ordem")
      .then(({ data }) => {
        setItems((data as GaleriaItem[]) || []);
        setLoading(false);
      });
  }, [artistaId]);

  if (loading || items.length === 0) return null;

  const fotos = items.filter((i) => i.tipo === "foto");
  const videos = items.filter((i) => i.tipo === "video");

  const navigateFullscreen = (dir: number) => {
    if (fullscreenIdx === null) return;
    const newIdx = fullscreenIdx + dir;
    if (newIdx >= 0 && newIdx < fotos.length) setFullscreenIdx(newIdx);
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
        <ImageIcon className="w-5 h-5 text-primary" />
        Galeria
      </h2>

      {/* Photos grid */}
      {fotos.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5">
          {fotos.map((item, idx) => (
            <div
              key={item.id}
              className="aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer"
              onClick={() => setFullscreenIdx(idx)}
            >
              <img src={item.url} alt={item.titulo || ""} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}

      {/* Videos */}
      {videos.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Film className="w-4 h-4 text-primary" /> Vídeos
          </p>
          {videos.map((item) => {
            const ytEmbed = getYoutubeEmbedUrl(item.url);
            const igEmbed = getInstagramEmbedUrl(item.url);
            const embedUrl = ytEmbed || igEmbed;

            return (
              <div key={item.id} className="space-y-1">
                {item.titulo && (
                  <p className="text-xs font-medium text-foreground">{item.titulo}</p>
                )}
                {embedUrl ? (
                  <div className="aspect-video rounded-xl overflow-hidden bg-muted">
                    <iframe
                      src={embedUrl}
                      className="w-full h-full"
                      allowFullScreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                  </div>
                ) : (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-muted rounded-xl p-3 text-sm text-primary hover:underline"
                  >
                    🔗 Ver vídeo externo
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Fullscreen photo viewer */}
      {fullscreenIdx !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setFullscreenIdx(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white z-10"
            onClick={() => setFullscreenIdx(null)}
          >
            <X className="w-6 h-6" />
          </button>

          {fullscreenIdx > 0 && (
            <button
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white z-10"
              onClick={(e) => { e.stopPropagation(); navigateFullscreen(-1); }}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {fullscreenIdx < fotos.length - 1 && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white z-10"
              onClick={(e) => { e.stopPropagation(); navigateFullscreen(1); }}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          <img
            src={fotos[fullscreenIdx].url}
            alt={fotos[fullscreenIdx].titulo || ""}
            className="max-w-full max-h-full object-contain p-4"
            onClick={(e) => e.stopPropagation()}
          />

          <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-1.5">
            {fotos.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${i === fullscreenIdx ? "bg-white" : "bg-white/30"}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
