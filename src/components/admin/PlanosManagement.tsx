import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Crown } from "lucide-react";
import { formatKz } from "@/lib/formatKz";

interface Plano {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  duracao_dias: number;
  beneficios: any;
  ativo: boolean;
  ordem: number;
}

const empty = { nome: "", descricao: "", preco: 0, duracao_dias: 30, beneficios_texto: "", ativo: true, ordem: 0 };

export const PlanosManagement = () => {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("planos_carteira").select("*").order("ordem", { ascending: true });
    setPlanos((data as Plano[]) || []);
    setLoading(false);
  };

  const openNew = () => { setEditId(null); setForm(empty); setDialogOpen(true); };
  const openEdit = (p: Plano) => {
    setEditId(p.id);
    setForm({
      nome: p.nome,
      descricao: p.descricao || "",
      preco: Number(p.preco),
      duracao_dias: p.duracao_dias,
      beneficios_texto: Array.isArray(p.beneficios?.lista) ? p.beneficios.lista.join("\n") : "",
      ativo: p.ativo,
      ordem: p.ordem,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.nome || form.preco < 0 || form.duracao_dias <= 0) {
      toast.error("Preencha nome, preço e duração corretamente");
      return;
    }
    setSaving(true);
    const beneficios = { lista: form.beneficios_texto.split("\n").map(s => s.trim()).filter(Boolean) };
    const payload = {
      nome: form.nome,
      descricao: form.descricao || null,
      preco: Number(form.preco),
      duracao_dias: Number(form.duracao_dias),
      beneficios,
      ativo: form.ativo,
      ordem: Number(form.ordem),
    };
    const { error } = editId
      ? await supabase.from("planos_carteira").update(payload).eq("id", editId)
      : await supabase.from("planos_carteira").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editId ? "Plano atualizado" : "Plano criado");
    setDialogOpen(false);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Eliminar este plano?")) return;
    const { error } = await supabase.from("planos_carteira").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Plano eliminado");
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2"><Crown className="w-5 h-5" /> Planos</h3>
        <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Novo</Button>
      </div>

      {loading ? (
        <div className="flex justify-center p-6"><Loader2 className="w-5 h-5 animate-spin text-white" /></div>
      ) : planos.length === 0 ? (
        <Card className="p-4 text-center text-muted-foreground">Nenhum plano criado</Card>
      ) : (
        planos.map((p) => (
          <Card key={p.id} className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{p.nome}</p>
                  {!p.ativo && <span className="text-[10px] bg-muted px-2 py-0.5 rounded">Inativo</span>}
                </div>
                <p className="text-xs text-muted-foreground">{p.descricao}</p>
                <p className="text-sm mt-1">
                  <span className="font-bold text-primary">{formatKz(Number(p.preco))}</span>
                  <span className="text-xs text-muted-foreground"> / {p.duracao_dias} dias</span>
                </p>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => del(p.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            </div>
          </Card>
        ))
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Editar plano" : "Novo plano"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} /></div>
            <div><Label>Descrição</Label><Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Preço (Kz)</Label><Input type="number" value={form.preco} onChange={e => setForm(f => ({ ...f, preco: Number(e.target.value) }))} /></div>
              <div><Label>Duração (dias)</Label><Input type="number" value={form.duracao_dias} onChange={e => setForm(f => ({ ...f, duracao_dias: Number(e.target.value) }))} /></div>
            </div>
            <div><Label>Ordem</Label><Input type="number" value={form.ordem} onChange={e => setForm(f => ({ ...f, ordem: Number(e.target.value) }))} /></div>
            <div>
              <Label>Benefícios (um por linha)</Label>
              <Textarea rows={4} value={form.beneficios_texto} onChange={e => setForm(f => ({ ...f, beneficios_texto: e.target.value }))} placeholder="Acesso a Odds Premium&#10;Suporte prioritário" />
            </div>
            <div className="flex items-center gap-2"><Switch checked={form.ativo} onCheckedChange={v => setForm(f => ({ ...f, ativo: v }))} /><Label>Ativo</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
