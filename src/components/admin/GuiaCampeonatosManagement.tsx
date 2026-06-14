import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Categoria = "mais_15" | "mais_25" | "mais_35" | "under";

const CATEGORIA_LABELS: Record<Categoria, string> = {
  mais_15: "Mais 1.5",
  mais_25: "Mais 2.5",
  mais_35: "Mais 3.5",
  under: "Perfil Under",
};

interface Item {
  id: string;
  categoria: Categoria;
  bandeira: string;
  nome: string;
  ordem: number;
}

export function GuiaCampeonatosManagement() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [form, setForm] = useState<{ categoria: Categoria; bandeira: string; nome: string; ordem: number }>({
    categoria: "mais_15",
    bandeira: "",
    nome: "",
    ordem: 0,
  });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("guia_campeonatos")
      .select("*")
      .order("categoria")
      .order("ordem");
    if (error) toast.error("Erro ao carregar campeonatos");
    else setItems((data as Item[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = (categoria: Categoria) => {
    setEditing(null);
    const max = items.filter((i) => i.categoria === categoria).reduce((m, i) => Math.max(m, i.ordem), 0);
    setForm({ categoria, bandeira: "", nome: "", ordem: max + 1 });
    setOpen(true);
  };

  const openEdit = (item: Item) => {
    setEditing(item);
    setForm({ categoria: item.categoria, bandeira: item.bandeira, nome: item.nome, ordem: item.ordem });
    setOpen(true);
  };

  const save = async () => {
    if (!form.nome.trim() || !form.bandeira.trim()) {
      toast.error("Bandeira e nome são obrigatórios");
      return;
    }
    if (editing) {
      const { error } = await supabase.from("guia_campeonatos").update(form).eq("id", editing.id);
      if (error) return toast.error("Erro ao atualizar");
      toast.success("Atualizado");
    } else {
      const { error } = await supabase.from("guia_campeonatos").insert(form);
      if (error) return toast.error("Erro ao criar");
      toast.success("Adicionado");
    }
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este campeonato?")) return;
    const { error } = await supabase.from("guia_campeonatos").delete().eq("id", id);
    if (error) return toast.error("Erro ao excluir");
    toast.success("Excluído");
    load();
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const cats: Categoria[] = ["mais_15", "mais_25", "mais_35", "under"];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-white">Guia de Campeonatos</h2>
        <p className="text-xs text-muted-foreground">Gerencie os campeonatos exibidos no guia de análise de golos.</p>
      </div>

      {cats.map((cat) => {
        const list = items.filter((i) => i.categoria === cat);
        return (
          <Card key={cat} className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{CATEGORIA_LABELS[cat]}</h3>
              <Button size="sm" onClick={() => openNew(cat)}>
                <Plus className="w-4 h-4 mr-1" /> Adicionar
              </Button>
            </div>
            {list.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum campeonato.</p>
            ) : (
              <div className="space-y-1.5">
                {list.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-2 p-2 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg">{item.bandeira}</span>
                      <span className="text-sm truncate">{item.nome}</span>
                      <span className="text-[10px] text-muted-foreground">#{item.ordem}</span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(item)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(item.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar campeonato" : "Novo campeonato"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Categoria</Label>
              <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v as Categoria })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {cats.map((c) => (
                    <SelectItem key={c} value={c}>{CATEGORIA_LABELS[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>Bandeira</Label>
                <Input value={form.bandeira} onChange={(e) => setForm({ ...form, bandeira: e.target.value })} placeholder="🇧🇷" />
              </div>
              <div className="col-span-2">
                <Label>Nome</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Brasileirão" />
              </div>
            </div>
            <div>
              <Label>Ordem</Label>
              <Input type="number" value={form.ordem} onChange={(e) => setForm({ ...form, ordem: Number(e.target.value) })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>{editing ? "Salvar" : "Adicionar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
