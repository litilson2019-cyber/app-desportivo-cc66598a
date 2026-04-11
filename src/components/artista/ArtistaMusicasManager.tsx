import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Music, Upload, Link, Play, Pause } from "lucide-react";

interface Musica {
  id: string;
  titulo: string;
  preco: number;
  audio_url: string | null;
  preview_url: string | null;
  external_link: string | null;
  contacto_link: string | null;
  duracao_preview: number;
  ordem: number;
}

export function ArtistaMusicasManager({ artistaId }: { artistaId: string }) {
  const { toast } = useToast();
  const [musicas, setMusicas] = useState<Musica[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    titulo: "",
    preco: "",
    external_link: "",
    contacto_link: "",
    duracao_preview: "30",
  });
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    loadMusicas();
    return () => { audioEl?.pause(); };
  }, [artistaId]);

  const loadMusicas = async () => {
    const { data } = await supabase
      .from("artista_musicas")
      .select("*")
      .eq("artista_id", artistaId)
      .order("ordem");
    setMusicas((data as Musica[]) || []);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!form.titulo.trim()) {
      toast({ title: "Preencha o título da música", variant: "destructive" });
      return;
    }
    if (!audioFile && !form.external_link.trim()) {
      toast({ title: "Adicione um ficheiro de áudio ou link externo", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      let audio_url: string | null = null;
      let preview_url: string | null = null;

      if (audioFile) {
        if (audioFile.size > 20 * 1024 * 1024) {
          toast({ title: "Ficheiro deve ter no máximo 20MB", variant: "destructive" });
          setUploading(false);
          return;
        }

        const ext = audioFile.name.split(".").pop();
        const basePath = `${artistaId}/${Date.now()}`;

        // Upload full audio
        const fullPath = `${basePath}/full.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("musicas")
          .upload(fullPath, audioFile, { contentType: audioFile.type });
        if (upErr) throw upErr;

        const { data: fullUrl } = supabase.storage.from("musicas").getPublicUrl(fullPath);
        audio_url = fullUrl.publicUrl;

        // Generate preview client-side using Web Audio API
        try {
          const previewBlob = await generatePreview(audioFile, Number(form.duracao_preview) || 30);
          const previewPath = `${basePath}/preview.mp3`;
          const { error: prevErr } = await supabase.storage
            .from("musicas")
            .upload(previewPath, previewBlob, { contentType: "audio/mpeg" });
          if (prevErr) throw prevErr;
          const { data: prevUrl } = supabase.storage.from("musicas").getPublicUrl(previewPath);
          preview_url = prevUrl.publicUrl;
        } catch {
          // If preview generation fails, use full audio (player will cut at duration)
          preview_url = audio_url;
        }
      }

      const { error } = await supabase.from("artista_musicas").insert({
        artista_id: artistaId,
        titulo: form.titulo,
        preco: Number(form.preco) || 0,
        audio_url,
        preview_url: preview_url || audio_url,
        external_link: form.external_link || null,
        contacto_link: form.contacto_link || null,
        duracao_preview: Number(form.duracao_preview) || 30,
        ordem: musicas.length,
      });

      if (error) throw error;

      toast({ title: "Música adicionada!" });
      setForm({ titulo: "", preco: "", external_link: "", contacto_link: "", duracao_preview: "30" });
      setAudioFile(null);
      setShowForm(false);
      loadMusicas();
    } catch (err: any) {
      toast({ title: "Erro ao adicionar música", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const generatePreview = (file: File, seconds: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const ctx = new AudioContext();
          const buffer = await ctx.decodeAudioData(reader.result as ArrayBuffer);
          const duration = Math.min(seconds, buffer.duration);
          const offlineCtx = new OfflineAudioContext(
            buffer.numberOfChannels,
            Math.ceil(duration * buffer.sampleRate),
            buffer.sampleRate
          );
          const source = offlineCtx.createBufferSource();
          source.buffer = buffer;
          source.connect(offlineCtx.destination);
          source.start(0, 0, duration);
          const rendered = await offlineCtx.startRendering();

          // Convert to WAV blob (simpler than MP3 encoding)
          const wavBlob = audioBufferToWav(rendered);
          ctx.close();
          resolve(wavBlob);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const audioBufferToWav = (buffer: AudioBuffer): Blob => {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1;
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const dataLength = buffer.length * blockAlign;
    const headerLength = 44;
    const arrayBuffer = new ArrayBuffer(headerLength + dataLength);
    const view = new DataView(arrayBuffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, "data");
    view.setUint32(40, dataLength, true);

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: "audio/wav" });
  };

  const handleDelete = async (musica: Musica) => {
    try {
      await supabase.from("artista_musicas").delete().eq("id", musica.id);
      toast({ title: "Música removida" });
      loadMusicas();
    } catch {
      toast({ title: "Erro ao remover", variant: "destructive" });
    }
  };

  const togglePlay = (musica: Musica) => {
    if (playingId === musica.id) {
      audioEl?.pause();
      setPlayingId(null);
      return;
    }

    audioEl?.pause();
    const url = musica.preview_url || musica.audio_url;
    if (!url) return;

    const audio = new Audio(url);
    audio.play();
    setAudioEl(audio);
    setPlayingId(musica.id);

    // Auto-stop at preview duration
    const maxDuration = musica.duracao_preview || 30;
    const timer = setTimeout(() => {
      audio.pause();
      setPlayingId(null);
    }, maxDuration * 1000);

    audio.onended = () => {
      clearTimeout(timer);
      setPlayingId(null);
    };
  };

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <Card className="p-4 shadow-soft rounded-xl space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <Music className="w-4 h-4 text-primary" />
          Músicas ({musicas.length})
        </h3>
        <Button size="sm" variant="outline" className="rounded-xl gap-1" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-3 h-3" /> Adicionar
        </Button>
      </div>

      {showForm && (
        <div className="space-y-3 p-3 bg-muted/50 rounded-xl">
          <Input
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            placeholder="Título da música *"
            className="rounded-xl"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              value={form.preco}
              onChange={(e) => setForm({ ...form, preco: e.target.value })}
              placeholder="Preço (Kz)"
              className="rounded-xl"
            />
            <Input
              type="number"
              value={form.duracao_preview}
              onChange={(e) => setForm({ ...form, duracao_preview: e.target.value })}
              placeholder="Preview (seg)"
              min="15"
              max="30"
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Ficheiro de Áudio (MP3/WAV, máx 20MB)</label>
            <label className="cursor-pointer block">
              <div className="flex items-center gap-2 p-2 border border-dashed border-border rounded-xl hover:bg-accent/50 transition-colors">
                <Upload className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {audioFile ? audioFile.name : "Selecionar ficheiro..."}
                </span>
              </div>
              <input
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              <Link className="w-3 h-3" /> Ou link externo (YouTube, SoundCloud, etc.)
            </label>
            <Input
              value={form.external_link}
              onChange={(e) => setForm({ ...form, external_link: e.target.value })}
              placeholder="https://..."
              className="rounded-xl"
            />
          </div>

          <Input
            value={form.contacto_link}
            onChange={(e) => setForm({ ...form, contacto_link: e.target.value })}
            placeholder="Link de contacto para compra (WhatsApp, etc.)"
            className="rounded-xl"
          />

          <Button onClick={handleSubmit} disabled={uploading} className="w-full rounded-xl gap-1.5">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {uploading ? "A carregar..." : "Adicionar Música"}
          </Button>
        </div>
      )}

      {musicas.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Nenhuma música adicionada</p>
      ) : (
        <div className="space-y-2">
          {musicas.map((m, i) => (
            <div key={m.id} className="flex items-center gap-3 p-2 bg-muted/30 rounded-xl">
              <span className="text-xs text-muted-foreground w-5 text-center">{i + 1}</span>
              {(m.audio_url || m.preview_url) && (
                <button
                  onClick={() => togglePlay(m)}
                  className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"
                >
                  {playingId === m.id ? (
                    <Pause className="w-3.5 h-3.5 text-primary" />
                  ) : (
                    <Play className="w-3.5 h-3.5 text-primary ml-0.5" />
                  )}
                </button>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{m.titulo}</p>
                <p className="text-xs text-muted-foreground">
                  {m.preco > 0 ? `${m.preco.toLocaleString()} Kz` : "Grátis"}
                  {m.external_link && " • Link externo"}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-destructive"
                onClick={() => handleDelete(m)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
