import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Save, Music, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function MeuPerfilArtista() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [artista, setArtista] = useState<any>(null);
  const [form, setForm] = useState({
    nome_artistico: "",
    bio: "",
    preco_album: "",
    preco_base_atuacao: "",
    cidade: "",
    contacto: "",
  });
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data } = await supabase
        .from("artistas")
        .select("*")
        .eq("user_id", user.id)
        .eq("tipo", "independente")
        .maybeSingle();

      if (data) {
        setArtista(data);
        setForm({
          nome_artistico: data.nome_artistico || "",
          bio: data.bio || "",
          preco_album: data.preco_album?.toString() || "",
          preco_base_atuacao: data.preco_base_atuacao?.toString() || "",
          cidade: data.cidade || "",
          contacto: data.contacto || "",
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.nome_artistico.trim()) {
      toast({ title: "Preencha o nome artístico", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nome_artistico: form.nome_artistico,
        bio: form.bio || null,
        preco_album: Number(form.preco_album) || 0,
        preco_base_atuacao: Number(form.preco_base_atuacao) || 0,
        cidade: form.cidade || null,
        contacto: form.contacto || null,
        updated_at: new Date().toISOString(),
      };

      if (artista) {
        await supabase.from("artistas").update(payload).eq("id", artista.id);
        toast({ title: "Perfil atualizado!" });
      } else {
        const { data, error } = await supabase.from("artistas").insert({
          user_id: userId!,
          tipo: "independente",
          ...payload,
        }).select().single();
        if (error) throw error;
        setArtista(data);
        toast({ title: "Perfil criado!" });
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!artista) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Imagem deve ter no máximo 5MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `artistas/${artista.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("marketplace").upload(fileName, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("marketplace").getPublicUrl(fileName);
      await supabase.from("artistas").update({ avatar_url: urlData.publicUrl }).eq("id", artista.id);
      setArtista({ ...artista, avatar_url: urlData.publicUrl });
      toast({ title: "Foto atualizada!" });
    } catch (err: any) {
      toast({ title: "Erro ao carregar foto", variant: "destructive" });
    } finally {
      setUploading(false);
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

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-subtle pb-20 p-4">
        <div className="max-w-2xl mx-auto pt-6 space-y-6">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>

          <h1 className="text-3xl font-bold text-foreground">Perfil Artista</h1>

          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
              {artista?.avatar_url ? (
                <img src={artista.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <Music className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            {artista && (
              <label className="cursor-pointer">
                <Button variant="outline" size="sm" className="gap-1.5 rounded-xl" asChild>
                  <span>{uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} {uploading ? "A carregar..." : "Alterar Foto"}</span>
                </Button>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])} />
              </label>
            )}
          </div>

          <Card className="p-4 shadow-soft rounded-xl space-y-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Nome Artístico *</label>
              <Input value={form.nome_artistico} onChange={(e) => setForm({ ...form, nome_artistico: e.target.value })} placeholder="Seu nome artístico" className="rounded-xl" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Biografia</label>
              <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Conte sobre você..." className="rounded-xl" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Preço Álbum (Kz)</label>
                <Input type="number" value={form.preco_album} onChange={(e) => setForm({ ...form, preco_album: e.target.value })} placeholder="0" className="rounded-xl" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Preço Atuação (Kz)</label>
                <Input type="number" value={form.preco_base_atuacao} onChange={(e) => setForm({ ...form, preco_base_atuacao: e.target.value })} placeholder="0" className="rounded-xl" />
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Cidade</label>
              <Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} placeholder="Luanda" className="rounded-xl" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Contacto</label>
              <Input value={form.contacto} onChange={(e) => setForm({ ...form, contacto: e.target.value })} placeholder="WhatsApp, email..." className="rounded-xl" />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full rounded-xl gap-1.5">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {artista ? "Guardar Alterações" : "Criar Perfil"}
            </Button>
          </Card>

          {artista?.produtora_id && (
            <Card className="p-4 shadow-soft rounded-xl">
              <p className="text-sm text-muted-foreground">
                Gerenciado por uma produtora
              </p>
            </Card>
          )}
        </div>
      </div>
      <BottomNav />
    </AuthGuard>
  );
}
