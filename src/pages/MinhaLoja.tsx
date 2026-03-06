import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Store, Trash2, Upload, ArrowLeft, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function MinhaLoja() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loja, setLoja] = useState<any>(null);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [lojaForm, setLojaForm] = useState({ nome: "", bio: "", contacto_whatsapp: "", contacto_outro: "" });
  const [showProdutoDialog, setShowProdutoDialog] = useState(false);
  const [produtoForm, setProdutoForm] = useState({ nome: "", descricao: "", preco: "", contacto_link: "" });
  const [produtoImages, setProdutoImages] = useState<File[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: lojaData } = await supabase
        .from("lojas")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (lojaData) {
        setLoja(lojaData);
        setLojaForm({
          nome: lojaData.nome || "",
          bio: lojaData.bio || "",
          contacto_whatsapp: lojaData.contacto_whatsapp || "",
          contacto_outro: lojaData.contacto_outro || "",
        });

        const { data: prods } = await supabase
          .from("produtos")
          .select("id, nome, descricao, preco, contacto_link, ativo")
          .eq("loja_id", lojaData.id)
          .order("ordem");

        setProdutos(prods || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLoja = async () => {
    if (!lojaForm.nome.trim()) {
      toast({ title: "Preencha o nome da loja", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (loja) {
        await supabase.from("lojas").update({
          nome: lojaForm.nome,
          bio: lojaForm.bio || null,
          contacto_whatsapp: lojaForm.contacto_whatsapp || null,
          contacto_outro: lojaForm.contacto_outro || null,
          updated_at: new Date().toISOString(),
        }).eq("id", loja.id);
        toast({ title: "Loja atualizada!" });
      } else {
        const { data: newLoja, error } = await supabase.from("lojas").insert({
          user_id: userId!,
          nome: lojaForm.nome,
          bio: lojaForm.bio || null,
          contacto_whatsapp: lojaForm.contacto_whatsapp || null,
          contacto_outro: lojaForm.contacto_outro || null,
        }).select().single();
        if (error) throw error;
        setLoja(newLoja);
        toast({ title: "Loja criada!" });
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAddProduto = async () => {
    if (!produtoForm.nome.trim() || !loja) return;
    setSaving(true);
    try {
      const { data: prod, error } = await supabase.from("produtos").insert({
        loja_id: loja.id,
        nome: produtoForm.nome,
        descricao: produtoForm.descricao || null,
        preco: Number(produtoForm.preco) || 0,
        contacto_link: produtoForm.contacto_link || null,
      }).select().single();
      if (error) throw error;

      // Upload images
      for (let i = 0; i < produtoImages.length && i < 6; i++) {
        const file = produtoImages[i];
        const ext = file.name.split(".").pop();
        const fileName = `produtos/${prod.id}/${Date.now()}-${i}.${ext}`;
        const { error: upErr } = await supabase.storage.from("marketplace").upload(fileName, file, { contentType: file.type });
        if (!upErr) {
          const { data: urlData } = supabase.storage.from("marketplace").getPublicUrl(fileName);
          await supabase.from("produto_imagens").insert({
            produto_id: prod.id,
            imagem_url: urlData.publicUrl,
            ordem: i,
          });
        }
      }

      toast({ title: "Produto adicionado!" });
      setShowProdutoDialog(false);
      setProdutoForm({ nome: "", descricao: "", preco: "", contacto_link: "" });
      setProdutoImages([]);
      loadData();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduto = async (prodId: string) => {
    try {
      await supabase.from("produto_imagens").delete().eq("produto_id", prodId);
      await supabase.from("produtos").delete().eq("id", prodId);
      setProdutos((prev) => prev.filter((p) => p.id !== prodId));
      toast({ title: "Produto removido" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!loja) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Imagem deve ter no máximo 5MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `logos/${loja.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("marketplace").upload(fileName, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("marketplace").getPublicUrl(fileName);
      await supabase.from("lojas").update({ logo_url: urlData.publicUrl }).eq("id", loja.id);
      setLoja({ ...loja, logo_url: urlData.publicUrl });
      toast({ title: "Logo atualizado!" });
    } catch (err: any) {
      toast({ title: "Erro ao carregar logo", variant: "destructive" });
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

          <h1 className="text-3xl font-bold text-foreground">Minha Loja</h1>

          {/* Store Logo */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
              {loja?.logo_url ? (
                <img src={loja.logo_url} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Store className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            {loja && (
              <label className="cursor-pointer">
                <Button variant="outline" size="sm" className="gap-1.5 rounded-xl" asChild>
                  <span>{uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} {uploading ? "A carregar..." : "Alterar Logo"}</span>
                </Button>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])} />
              </label>
            )}
          </div>

          {/* Store Form */}
          <Card className="p-4 shadow-soft rounded-xl space-y-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Nome da Loja *</label>
              <Input value={lojaForm.nome} onChange={(e) => setLojaForm({ ...lojaForm, nome: e.target.value })} placeholder="Nome da sua loja" className="rounded-xl" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Biografia</label>
              <Textarea value={lojaForm.bio} onChange={(e) => setLojaForm({ ...lojaForm, bio: e.target.value })} placeholder="Descreva a sua loja..." className="rounded-xl" rows={3} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">WhatsApp</label>
              <Input value={lojaForm.contacto_whatsapp} onChange={(e) => setLojaForm({ ...lojaForm, contacto_whatsapp: e.target.value })} placeholder="244XXXXXXXXX" className="rounded-xl" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Outro Contacto</label>
              <Input value={lojaForm.contacto_outro} onChange={(e) => setLojaForm({ ...lojaForm, contacto_outro: e.target.value })} placeholder="Email, telefone, etc." className="rounded-xl" />
            </div>
            <Button onClick={handleSaveLoja} disabled={saving} className="w-full rounded-xl gap-1.5">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {loja ? "Guardar Alterações" : "Criar Loja"}
            </Button>
          </Card>

          {/* Products */}
          {loja && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground">Produtos ({produtos.length})</h2>
                <Button size="sm" className="gap-1 rounded-xl" onClick={() => setShowProdutoDialog(true)}>
                  <Plus className="w-4 h-4" /> Adicionar
                </Button>
              </div>
              {produtos.length === 0 ? (
                <Card className="p-6 shadow-soft rounded-xl text-center">
                  <p className="text-muted-foreground text-sm">Nenhum produto adicionado</p>
                </Card>
              ) : (
                <div className="space-y-2">
                  {produtos.map((p) => (
                    <Card key={p.id} className="p-3 shadow-soft rounded-xl flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground text-sm">{p.nome}</p>
                        <p className="text-xs text-muted-foreground">{Number(p.preco).toLocaleString("pt-PT")} Kz</p>
                      </div>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteProduto(p.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <BottomNav />

      {/* Add Product Dialog */}
      <Dialog open={showProdutoDialog} onOpenChange={setShowProdutoDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Produto</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Nome *</label>
              <Input value={produtoForm.nome} onChange={(e) => setProdutoForm({ ...produtoForm, nome: e.target.value })} placeholder="Nome do produto" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Descrição</label>
              <Textarea value={produtoForm.descricao} onChange={(e) => setProdutoForm({ ...produtoForm, descricao: e.target.value })} placeholder="Descrição detalhada" rows={3} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Preço (Kz)</label>
              <Input type="number" value={produtoForm.preco} onChange={(e) => setProdutoForm({ ...produtoForm, preco: e.target.value })} placeholder="0" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Link de Contacto</label>
              <Input value={produtoForm.contacto_link} onChange={(e) => setProdutoForm({ ...produtoForm, contacto_link: e.target.value })} placeholder="https://wa.me/244..." />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Imagens (máx. 6)</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []).slice(0, 6);
                  setProdutoImages(files);
                }}
                className="text-sm"
              />
              {produtoImages.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">{produtoImages.length} imagem(ns) selecionada(s)</p>
              )}
            </div>
            <Button onClick={handleAddProduto} disabled={saving || !produtoForm.nome.trim()} className="w-full gap-1.5">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Adicionar Produto
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AuthGuard>
  );
}
