import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const categorias = [
  { value: "imoveis", label: "Imóveis" },
  { value: "veiculos", label: "Veículos" },
  { value: "eletronicos", label: "Eletrónicos / Tecnologia" },
  { value: "outros", label: "Outros" },
];

export default function MeusAnuncios() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [anuncios, setAnuncios] = useState<any[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ titulo: "", descricao: "", preco: "", localizacao: "", categoria: "outros", contacto_link: "" });
  const [images, setImages] = useState<File[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("anuncios_marketplace")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setAnuncios(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.titulo.trim()) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: anuncio, error } = await supabase.from("anuncios_marketplace").insert({
        user_id: user.id,
        titulo: form.titulo,
        descricao: form.descricao || null,
        preco: Number(form.preco) || 0,
        localizacao: form.localizacao || null,
        categoria: form.categoria,
        contacto_link: form.contacto_link || null,
      }).select().single();
      if (error) throw error;

      for (let i = 0; i < images.length && i < 6; i++) {
        const file = images[i];
        const ext = file.name.split(".").pop();
        const fileName = `anuncios/${anuncio.id}/${Date.now()}-${i}.${ext}`;
        const { error: upErr } = await supabase.storage.from("marketplace").upload(fileName, file, { contentType: file.type });
        if (!upErr) {
          const { data: urlData } = supabase.storage.from("marketplace").getPublicUrl(fileName);
          await supabase.from("anuncio_imagens").insert({
            anuncio_id: anuncio.id,
            imagem_url: urlData.publicUrl,
            ordem: i,
          });
        }
      }

      toast({ title: "Anúncio criado!" });
      setShowDialog(false);
      setForm({ titulo: "", descricao: "", preco: "", localizacao: "", categoria: "outros", contacto_link: "" });
      setImages([]);
      loadData();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await supabase.from("anuncio_imagens").delete().eq("anuncio_id", id);
      await supabase.from("anuncios_marketplace").delete().eq("id", id);
      setAnuncios((prev) => prev.filter((a) => a.id !== id));
      toast({ title: "Anúncio removido" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-subtle pb-20 p-4">
        <div className="max-w-2xl mx-auto pt-6 space-y-6">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>

          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-foreground">Meus Anúncios</h1>
            <Button size="sm" className="gap-1 rounded-xl" onClick={() => setShowDialog(true)}>
              <Plus className="w-4 h-4" /> Novo
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : anuncios.length === 0 ? (
            <Card className="p-6 shadow-soft rounded-xl text-center">
              <p className="text-muted-foreground text-sm">Nenhum anúncio publicado</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {anuncios.map((a) => (
                <Card key={a.id} className="p-3 shadow-soft rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground text-sm">{a.titulo}</p>
                    <p className="text-xs text-muted-foreground">{Number(a.preco).toLocaleString("pt-PT")} Kz • {a.categoria}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(a.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
      <BottomNav />

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Anúncio</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Título *</label>
              <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Título do anúncio" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Categoria</label>
              <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Descrição</label>
              <Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={3} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Preço (Kz)</label>
              <Input type="number" value={form.preco} onChange={(e) => setForm({ ...form, preco: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Localização</label>
              <Input value={form.localizacao} onChange={(e) => setForm({ ...form, localizacao: e.target.value })} placeholder="Luanda, Viana..." />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Link de Contacto</label>
              <Input value={form.contacto_link} onChange={(e) => setForm({ ...form, contacto_link: e.target.value })} placeholder="https://wa.me/244..." />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Imagens (máx. 6)</label>
              <input type="file" accept="image/*" multiple onChange={(e) => setImages(Array.from(e.target.files || []).slice(0, 6))} className="text-sm" />
              {images.length > 0 && <p className="text-xs text-muted-foreground mt-1">{images.length} imagem(ns)</p>}
            </div>
            <Button onClick={handleCreate} disabled={saving || !form.titulo.trim()} className="w-full gap-1.5">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Publicar Anúncio
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AuthGuard>
  );
}
