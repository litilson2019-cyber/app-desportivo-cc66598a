import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Trash2, Plus, Film, Image as ImageIcon } from "lucide-react";

interface GaleriaItem {
  id: string;
  tipo: string;
  url: string;
  titulo: string | null;
  ordem: number;
}

interface Props {
  artistaId: string;
}

export function ArtistaGaleriaManager({ artistaId }: Props) {
  const { toast } = useToast();
  const [items, setItems] = useState<GaleriaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoTitulo, setVideoTitulo] = useState("");

  useEffect(() => {
    loadGaleria();
  }, [artistaId]);

  const loadGaleria = async () => {
    const { data } = await supabase
      .from("artista_galeria")
      .select("*")
      .eq("artista_id", artistaId)
      .order("ordem");
    setItems((data as GaleriaItem[]) || []);
    setLoading(false);
  };

  const handlePhotoUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Imagem deve ter no máximo 5MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `artistas/${artistaId}/galeria/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("marketplace").upload(fileName, file, { contentType: file.type });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("marketplace").getPublicUrl(fileName);

      await supabase.from("artista_galeria").insert({
        artista_id: artistaId,
        tipo: "foto",
        url: urlData.publicUrl,
        titulo: null,
        ordem: items.length,
      });
      toast({ title: "Foto adicionada!" });
      loadGaleria();
    } catch {
      toast({ title: "Erro ao carregar foto", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleAddVideo = async () => {
    if (!videoUrl.trim()) return;
    try {
      await supabase.from("artista_galeria").insert({
        artista_id: artistaId,
        tipo: "video",
        url: videoUrl.trim(),
        titulo: videoTitulo.trim() || null,
        ordem: items.length,
      });
      setVideoUrl("");
      setVideoTitulo("");
      toast({ title: "Vídeo adicionado!" });
      loadGaleria();
    } catch {
      toast({ title: "Erro ao adicionar vídeo", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("artista_galeria").delete().eq("id", id);
    setItems(items.filter((i) => i.id !== id));
    toast({ title: "Item removido" });
  };

  if (loading) {
    return (
      <Card className="p-4 shadow-soft rounded-xl flex justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  return (
    <Card className="p-4 shadow-soft rounded-xl space-y-4">
      <h3 className="font-bold text-foreground flex items-center gap-2">
        <ImageIcon className="w-4 h-4 text-primary" />
        Galeria de Fotos & Vídeos
      </h3>

      {/* Current items */}
      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {items.map((item) => (
            <div key={item.id} className="relative group aspect-square rounded-lg overflow-hidden bg-muted">
              {item.tipo === "foto" ? (
                <img src={item.url} alt={item.titulo || ""} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-muted gap-1">
                  <Film className="w-6 h-6 text-primary" />
                  <span className="text-[10px] text-muted-foreground text-center px-1 truncate w-full">
                    {item.titulo || "Vídeo"}
                  </span>
                </div>
              )}
              <button
                onClick={() => handleDelete(item.id)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add photo */}
      <div className="flex items-center gap-2">
        <label className="cursor-pointer flex-1">
          <Button variant="outline" size="sm" className="w-full gap-1.5 rounded-xl" asChild>
            <span>
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              {uploading ? "A carregar..." : "Adicionar Foto"}
            </span>
          </Button>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])}
          />
        </label>
      </div>

      {/* Add video */}
      <div className="space-y-2 border-t border-border pt-3">
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Film className="w-3 h-3" /> Adicionar vídeo (YouTube, Instagram...)
        </p>
        <Input
          value={videoTitulo}
          onChange={(e) => setVideoTitulo(e.target.value)}
          placeholder="Título do vídeo (opcional)"
          className="rounded-xl text-sm"
        />
        <div className="flex gap-2">
          <Input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="rounded-xl text-sm flex-1"
          />
          <Button size="sm" onClick={handleAddVideo} disabled={!videoUrl.trim()} className="rounded-xl gap-1">
            <Plus className="w-3 h-3" /> Adicionar
          </Button>
        </div>
      </div>
    </Card>
  );
}
