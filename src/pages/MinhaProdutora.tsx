import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Save, Building2, Plus, Trash2, Calculator, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatKz } from "@/lib/formatKz";

export default function MinhaProdutora() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [produtora, setProdutora] = useState<any>(null);
  const [musicos, setMusicos] = useState<any[]>([]);
  const [form, setForm] = useState({
    nome: "", nif: "", contacto: "", endereco: "", responsavel: "", bio: "",
  });
  const [userId, setUserId] = useState<string | null>(null);

  // Add musician dialog
  const [showAddMusico, setShowAddMusico] = useState(false);
  const [musicoForm, setMusicoForm] = useState({
    nome_artistico: "", preco_base_atuacao: "", percentagem_musico: "40", percentagem_produtora: "60", tipo_evento_permitido: "",
  });

  // Calculator dialog
  const [showCalc, setShowCalc] = useState(false);
  const [calcMusico, setCalcMusico] = useState<any>(null);
  const [calcValor, setCalcValor] = useState("");
  const [calcResult, setCalcResult] = useState<{ musico: number; produtora: number } | null>(null);
  const [calcHistory, setCalcHistory] = useState<any[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data } = await supabase.from("produtoras").select("*").eq("user_id", user.id).maybeSingle();
      if (data) {
        setProdutora(data);
        setForm({
          nome: data.nome || "", nif: data.nif || "", contacto: data.contacto || "",
          endereco: data.endereco || "", responsavel: data.responsavel || "", bio: data.bio || "",
        });

        const { data: arts } = await supabase.from("artistas").select("*").eq("produtora_id", data.id).eq("ativo", true);
        setMusicos(arts || []);

        const { data: hist } = await supabase.from("calculos_atuacao").select("*").eq("produtora_id", data.id).order("created_at", { ascending: false }).limit(20);
        setCalcHistory(hist || []);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!form.nome.trim()) { toast({ title: "Preencha o nome", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const payload = { nome: form.nome, nif: form.nif || null, contacto: form.contacto || null, endereco: form.endereco || null, responsavel: form.responsavel || null, bio: form.bio || null, updated_at: new Date().toISOString() };
      if (produtora) {
        await supabase.from("produtoras").update(payload).eq("id", produtora.id);
        toast({ title: "Produtora atualizada!" });
      } else {
        const { data, error } = await supabase.from("produtoras").insert({ user_id: userId!, ...payload }).select().single();
        if (error) throw error;
        setProdutora(data);
        toast({ title: "Produtora criada!" });
      }
    } catch (err: any) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleLogoUpload = async (file: File) => {
    if (!produtora) return;
    if (file.size > 5 * 1024 * 1024) { toast({ title: "Máximo 5MB", variant: "destructive" }); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `produtoras/${produtora.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("marketplace").upload(fileName, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("marketplace").getPublicUrl(fileName);
      await supabase.from("produtoras").update({ logo_url: urlData.publicUrl }).eq("id", produtora.id);
      setProdutora({ ...produtora, logo_url: urlData.publicUrl });
      toast({ title: "Logo atualizado!" });
    } catch { toast({ title: "Erro ao carregar logo", variant: "destructive" }); }
    finally { setUploading(false); }
  };

  const handleAddMusico = async () => {
    if (!musicoForm.nome_artistico.trim() || !produtora) return;
    setSaving(true);
    try {
      const pMusico = Number(musicoForm.percentagem_musico) || 40;
      const pProd = Number(musicoForm.percentagem_produtora) || 60;
      const { error } = await supabase.from("artistas").insert({
        user_id: userId!,
        nome_artistico: musicoForm.nome_artistico,
        preco_base_atuacao: Number(musicoForm.preco_base_atuacao) || 0,
        percentagem_musico: pMusico,
        percentagem_produtora: pProd,
        tipo_evento_permitido: musicoForm.tipo_evento_permitido || null,
        tipo: "gerenciado",
        produtora_id: produtora.id,
      });
      if (error) throw error;
      toast({ title: "Músico adicionado!" });
      setShowAddMusico(false);
      setMusicoForm({ nome_artistico: "", preco_base_atuacao: "", percentagem_musico: "40", percentagem_produtora: "60", tipo_evento_permitido: "" });
      loadData();
    } catch (err: any) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleDeleteMusico = async (id: string) => {
    try {
      await supabase.from("artistas").update({ ativo: false, produtora_id: null }).eq("id", id);
      setMusicos(prev => prev.filter(m => m.id !== id));
      toast({ title: "Músico removido" });
    } catch (err: any) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
  };

  const openCalc = (musico: any) => {
    setCalcMusico(musico);
    setCalcValor(musico.preco_base_atuacao?.toString() || "");
    setCalcResult(null);
    setShowCalc(true);
  };

  const doCalc = () => {
    if (!calcMusico || !calcValor) return;
    const total = Number(calcValor);
    const pM = calcMusico.percentagem_musico || 40;
    const pP = calcMusico.percentagem_produtora || 60;
    setCalcResult({ musico: (total * pM) / 100, produtora: (total * pP) / 100 });
  };

  const saveCalc = async () => {
    if (!calcResult || !calcMusico) return;
    setSaving(true);
    try {
      await supabase.from("calculos_atuacao").insert({
        artista_id: calcMusico.id,
        produtora_id: produtora.id,
        valor_total: Number(calcValor),
        percentagem_musico: calcMusico.percentagem_musico,
        percentagem_produtora: calcMusico.percentagem_produtora,
        valor_musico: calcResult.musico,
        valor_produtora: calcResult.produtora,
      });
      toast({ title: "Cálculo guardado!" });
      setShowCalc(false);
      loadData();
    } catch (err: any) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  if (loading) {
    return (<AuthGuard><div className="min-h-screen bg-gradient-subtle flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div><BottomNav /></AuthGuard>);
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-subtle pb-20 p-4">
        <div className="max-w-2xl mx-auto pt-6 space-y-6">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <h1 className="text-3xl font-bold text-foreground">Minha Produtora</h1>

          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
              {produtora?.logo_url ? <img src={produtora.logo_url} alt="Logo" className="w-full h-full object-cover" /> : <Building2 className="w-8 h-8 text-muted-foreground" />}
            </div>
            {produtora && (
              <label className="cursor-pointer">
                <Button variant="outline" size="sm" className="gap-1.5 rounded-xl" asChild>
                  <span>{uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} {uploading ? "A carregar..." : "Alterar Logo"}</span>
                </Button>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])} />
              </label>
            )}
          </div>

          {/* Form */}
          <Card className="p-4 shadow-soft rounded-xl space-y-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Nome *</label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome da produtora" className="rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">NIF</label>
                <Input value={form.nif} onChange={(e) => setForm({ ...form, nif: e.target.value })} className="rounded-xl" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Responsável</label>
                <Input value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} className="rounded-xl" />
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Contacto</label>
              <Input value={form.contacto} onChange={(e) => setForm({ ...form, contacto: e.target.value })} placeholder="WhatsApp, email..." className="rounded-xl" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Endereço</label>
              <Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} className="rounded-xl" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Biografia</label>
              <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="rounded-xl" rows={3} />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full rounded-xl gap-1.5">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {produtora ? "Guardar Alterações" : "Criar Produtora"}
            </Button>
          </Card>

          {/* Musicians */}
          {produtora && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground">Músicos ({musicos.length})</h2>
                <Button size="sm" className="gap-1 rounded-xl" onClick={() => setShowAddMusico(true)}>
                  <Plus className="w-4 h-4" /> Adicionar
                </Button>
              </div>
              {musicos.length === 0 ? (
                <Card className="p-6 shadow-soft rounded-xl text-center">
                  <p className="text-muted-foreground text-sm">Nenhum músico adicionado</p>
                </Card>
              ) : (
                <div className="space-y-2">
                  {musicos.map((m) => (
                    <Card key={m.id} className="p-3 shadow-soft rounded-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-foreground text-sm">{m.nome_artistico}</p>
                          <p className="text-xs text-muted-foreground">
                            Base: {formatKz(m.preco_base_atuacao || 0)} · {m.percentagem_musico}% / {m.percentagem_produtora}%
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openCalc(m)} className="text-primary">
                            <Calculator className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteMusico(m.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Calculation History */}
          {calcHistory.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-foreground">Histórico de Cálculos</h2>
              <div className="space-y-2">
                {calcHistory.map((c) => (
                  <Card key={c.id} className="p-3 shadow-soft rounded-xl">
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground font-medium">Total: {formatKz(c.valor_total)}</span>
                      <span className="text-muted-foreground text-xs">{new Date(c.created_at).toLocaleDateString("pt-PT")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Músico: {formatKz(c.valor_musico)} ({c.percentagem_musico}%) · Produtora: {formatKz(c.valor_produtora)} ({c.percentagem_produtora}%)
                    </p>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <BottomNav />

      {/* Add Musician Dialog */}
      <Dialog open={showAddMusico} onOpenChange={setShowAddMusico}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Adicionar Músico</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Nome Artístico *</label>
              <Input value={musicoForm.nome_artistico} onChange={(e) => setMusicoForm({ ...musicoForm, nome_artistico: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Preço Base Atuação (Kz)</label>
              <Input type="number" value={musicoForm.preco_base_atuacao} onChange={(e) => setMusicoForm({ ...musicoForm, preco_base_atuacao: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">% Músico</label>
                <Input type="number" value={musicoForm.percentagem_musico} onChange={(e) => setMusicoForm({ ...musicoForm, percentagem_musico: e.target.value })} />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">% Produtora</label>
                <Input type="number" value={musicoForm.percentagem_produtora} onChange={(e) => setMusicoForm({ ...musicoForm, percentagem_produtora: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Tipo de Evento Permitido</label>
              <Input value={musicoForm.tipo_evento_permitido} onChange={(e) => setMusicoForm({ ...musicoForm, tipo_evento_permitido: e.target.value })} placeholder="Shows, festas, etc." />
            </div>
            <Button onClick={handleAddMusico} disabled={saving || !musicoForm.nome_artistico.trim()} className="w-full gap-1.5">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Adicionar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Calculator Dialog */}
      <Dialog open={showCalc} onOpenChange={setShowCalc}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Calculadora de Atuação</DialogTitle></DialogHeader>
          {calcMusico && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Artista: <span className="font-semibold text-foreground">{calcMusico.nome_artistico}</span></p>
              <p className="text-xs text-muted-foreground">Divisão: {calcMusico.percentagem_musico}% músico / {calcMusico.percentagem_produtora}% produtora</p>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Valor Total (Kz)</label>
                <Input type="number" value={calcValor} onChange={(e) => { setCalcValor(e.target.value); setCalcResult(null); }} />
              </div>
              <Button onClick={doCalc} variant="outline" className="w-full gap-1.5 rounded-xl">
                <Calculator className="w-4 h-4" /> Calcular
              </Button>
              {calcResult && (
                <Card className="p-4 bg-primary/5 rounded-xl space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Músico ({calcMusico.percentagem_musico}%)</span>
                    <span className="font-bold text-foreground">{formatKz(calcResult.musico)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Produtora ({calcMusico.percentagem_produtora}%)</span>
                    <span className="font-bold text-foreground">{formatKz(calcResult.produtora)}</span>
                  </div>
                  <Button onClick={saveCalc} disabled={saving} className="w-full mt-2 gap-1.5">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar Cálculo
                  </Button>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AuthGuard>
  );
}
