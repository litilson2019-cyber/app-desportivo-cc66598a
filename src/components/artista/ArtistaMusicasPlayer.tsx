import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Music, Play, Pause, ShoppingCart, MessageCircle, ExternalLink } from "lucide-react";
import { formatKz } from "@/lib/formatKz";

interface Musica {
  id: string;
  titulo: string;
  preco: number;
  audio_url: string | null;
  preview_url: string | null;
  external_link: string | null;
  contacto_link: string | null;
  duracao_preview: number;
}

const KZ_TO_USDT = 0.00098;

export function ArtistaMusicasPlayer({ artistaId, contactoArtista }: { artistaId: string; contactoArtista?: string | null }) {
  const { toast } = useToast();
  const [musicas, setMusicas] = useState<Musica[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadMusicas();
    return () => {
      audioRef.current?.pause();
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [artistaId]);

  const loadMusicas = async () => {
    const { data } = await supabase
      .from("artista_musicas")
      .select("id, titulo, preco, audio_url, preview_url, external_link, contacto_link, duracao_preview")
      .eq("artista_id", artistaId)
      .eq("ativo", true)
      .order("ordem");
    setMusicas((data as Musica[]) || []);
    setLoading(false);
  };

  const stopPlaying = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPlayingId(null);
  };

  const togglePlay = (musica: Musica) => {
    if (playingId === musica.id) {
      stopPlaying();
      return;
    }

    stopPlaying();

    const url = musica.preview_url || musica.audio_url;
    if (!url) {
      if (musica.external_link) {
        window.open(musica.external_link, "_blank");
      }
      return;
    }

    const audio = new Audio(url);
    audioRef.current = audio;
    setPlayingId(musica.id);
    setProgress((p) => ({ ...p, [musica.id]: 0 }));

    const maxDuration = musica.duracao_preview || 30;

    audio.play().catch(() => {
      toast({ title: "Não foi possível reproduzir", variant: "destructive" });
      setPlayingId(null);
    });

    // Update progress bar
    const startTime = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const pct = Math.min((elapsed / maxDuration) * 100, 100);
      setProgress((p) => ({ ...p, [musica.id]: pct }));
    }, 100);

    // Auto-stop at preview duration
    timerRef.current = setTimeout(() => {
      audio.pause();
      if (intervalRef.current) clearInterval(intervalRef.current);
      setPlayingId(null);
      setProgress((p) => ({ ...p, [musica.id]: 100 }));
      toast({
        title: "Preview terminado",
        description: musica.preco > 0
          ? "Compre a música completa para ouvir na íntegra!"
          : "Contacte o artista para mais informações.",
      });
    }, maxDuration * 1000);

    audio.onended = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      setPlayingId(null);
      setProgress((p) => ({ ...p, [musica.id]: 100 }));
    };
  };

  const getContactLink = (musica: Musica) => {
    const link = musica.contacto_link || contactoArtista;
    if (!link) return null;
    if (link.startsWith("http")) return link;
    return `https://wa.me/${link.replace(/\D/g, "")}`;
  };

  if (loading || musicas.length === 0) return null;

  return (
    <div className="px-4 py-4 space-y-3">
      <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
        <Music className="w-5 h-5 text-primary" />
        Músicas
      </h2>

      <div className="space-y-2">
        {musicas.map((m, i) => {
          const isPlaying = playingId === m.id;
          const hasAudio = !!(m.audio_url || m.preview_url);
          const contactLink = getContactLink(m);
          const prog = progress[m.id] || 0;

          return (
            <div
              key={m.id}
              className="relative overflow-hidden bg-card border border-border rounded-xl p-3"
            >
              {/* Progress bar background */}
              {isPlaying && (
                <div
                  className="absolute inset-y-0 left-0 bg-primary/5 transition-all duration-100"
                  style={{ width: `${prog}%` }}
                />
              )}

              <div className="relative flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-5 text-center font-medium">
                  {i + 1}
                </span>

                {hasAudio ? (
                  <button
                    onClick={() => togglePlay(m)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                      isPlaying
                        ? "bg-primary text-primary-foreground"
                        : "bg-primary/10 text-primary hover:bg-primary/20"
                    }`}
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4 ml-0.5" />
                    )}
                  </button>
                ) : m.external_link ? (
                  <a
                    href={m.external_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 hover:bg-primary/20 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 text-primary" />
                  </a>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <Music className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{m.titulo}</p>
                  <div className="flex items-center gap-2">
                    {m.preco > 0 ? (
                      <>
                        <span className="text-xs font-bold text-primary">{formatKz(m.preco)}</span>
                        <span className="text-[10px] text-muted-foreground">~{(m.preco * KZ_TO_USDT).toFixed(2)} USDT</span>
                      </>
                    ) : (
                      <span className="text-xs text-green-600 font-medium">Grátis</span>
                    )}
                    {hasAudio && (
                      <span className="text-[10px] text-muted-foreground">
                        Preview {m.duracao_preview}s
                      </span>
                    )}
                  </div>
                </div>

                {/* Buy / Contact button */}
                {m.preco > 0 && contactLink ? (
                  <a href={contactLink} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" className="h-8 rounded-lg text-xs gap-1 bg-green-600 hover:bg-green-700 text-white">
                      <ShoppingCart className="w-3 h-3" />
                      Comprar
                    </Button>
                  </a>
                ) : contactLink ? (
                  <a href={contactLink} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs gap-1">
                      <MessageCircle className="w-3 h-3" />
                      Contactar
                    </Button>
                  </a>
                ) : null}
              </div>

              {/* Preview progress bar */}
              {isPlaying && (
                <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-100"
                    style={{ width: `${prog}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
