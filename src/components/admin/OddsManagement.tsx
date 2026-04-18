import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, ChevronDown, ChevronUp } from "lucide-react";

interface OddCasa {
  id: string;
  jogo_id: string;
  casa_aposta: string;
  odd_casa: number | null;
  odd_empate: number | null;
  odd_fora: number | null;
}

interface Jogo {
  id: string;
  equipa_casa: string;
  equipa_fora: string;
  competicao: string | null;
  data_inicio: string;
  ativo: boolean;
  odds_casas: OddCasa[];
}

const emptyJogo = { equipa_casa: "", equipa_fora: "", competicao: "", data_inicio: "", ativo: true };
const emptyOdd = { casa_aposta: "", odd_casa: "", odd_empate: "", odd_fora: "" };

export const OddsManagement = () => {
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [jogoDialog, setJogoDialog] = useState(false);
  const [editJogoId, setEditJogoId] = useState<string | null>(null);
  const [jogoForm, setJogoForm] = useState(emptyJogo);
  const [oddDialog, setOddDialog] = useState<{ open: boolean; jogoId: string | null; oddId: string | null }>({ open: false, jogoId: null, oddId: null });
  const [oddForm, setOddForm] = useState(emptyOdd);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("odds_jogos")
      .select("*, odds_casas(*)")
      .order("data_inicio", { ascending: true });
    setJogos((data as any) || []);
    setLoading(false);
  };

  const openNewJogo = () => { setEditJogoId(null); setJogoForm(emptyJogo); setJogoDialog(true); };
  const openEditJogo = (j: Jogo) => {
    setEditJogoId(j.id);
    setJogoForm({
      equipa_casa: j.equipa_casa,
      equipa_fora: j.equipa_fora,
      competicao: j.competicao || "",
      data_inicio: new Date(j.data_inicio).toISOString().slice(0, 16),
      ativo: j.ativo,
    });
    setJogoDialog(true);
  };

  const saveJogo = async () => {
    if (!jogoForm.equipa_casa || !jogoForm.equipa_fora || !jogoForm.data_inicio) {
      toast.error("Preencha equipas e data"); return;
    }
    setSaving(true);
    const payload = {
      equipa_casa: jogoForm.equipa_casa,
      equipa_fora: jogoForm.equipa_fora,
      competicao: jogoForm.competicao || null,
      data_inicio: new Date(jogoForm.data_inicio).toISOString(),
      ativo: jogoForm.ativo,
    };
    const { error } = editJogoId
      ? await supabase.from("odds_jogos").update(payload).eq("id", editJogoId)
      : await supabase.from("odds_jogos").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editJogoId ? "Jogo atualizado" : "Jogo criado");
    setJogoDialog(false);
    load();
  };

  const delJogo = async (id: string) => {
    if (!confirm("Eliminar este jogo e todas as odds?")) return;
    const { error } = await supabase.from("odds_jogos").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Jogo eliminado"); load();
  };

  const openNewOdd = (jogoId: string) => {
    setOddDialog({ open: true, jogoId, oddId: null });
    setOddForm(emptyOdd);
  };
  const openEditOdd = (jogoId: string, o: OddCasa) => {
    setOddDialog({ open: true, jogoId, oddId: o.id });
    setOddForm({
      casa_aposta: o.casa_aposta,
      odd_casa: o.odd_casa?.toString() ?? "",
      odd_empate: o.odd_empate?.toString() ?? "",
      odd_fora: o.odd_fora?.toString() ?? "",
    });
  };

  const saveOdd = async () => {
    if (!oddForm.casa_aposta || !oddDialog.jogoId) { toast.error("Preencha a casa de apostas"); return; }
    setSaving(true);
    const payload = {
      jogo_id: oddDialog.jogoId,
      casa_aposta: oddForm.casa_aposta,
      odd_casa: oddForm.odd_casa ? Number(oddForm.odd_casa) : null,
      odd_empate: oddForm.odd_empate ? Number(oddForm.odd_empate) : null,
      odd_fora: oddForm.odd_fora ? Number(oddForm.odd_fora) : null,
    };
    const { error } = oddDialog.oddId
      ? await supabase.from("odds_casas").update(payload).eq("id", oddDialog.oddId)
      : await supabase.from("odds_casas").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Odd guardada");
    setOddDialog({ open: false, jogoId: null, oddId: null });
    load();
  };

  const delOdd = async (id: string) => {
    if (!confirm("Eliminar esta odd?")) return;
    const { error } = await supabase.from("odds_casas").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Jogos & Odds</h3>
        <Button size="sm" onClick={openNewJogo}><Plus className="w-4 h-4 mr-1" /> Novo jogo</Button>
      </div>

      {loading ? (
        <div className="flex justify-center p-6"><Loader2 className="w-5 h-5 animate-spin text-white" /></div>
      ) : jogos.length === 0 ? (
        <Card className="p-4 text-center text-muted-foreground">Nenhum jogo criado</Card>
      ) : (
        jogos.map((j) => {
          const data = new Date(j.data_inicio);
          const isOpen = expanded[j.id];
          return (
            <Card key={j.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <button className="flex-1 text-left" onClick={() => setExpanded(s => ({ ...s, [j.id]: !s[j.id] }))}>
                  <p className="font-semibold flex items-center gap-2">
                    {j.equipa_casa} vs {j.equipa_fora}
                    {!j.ativo && <span className="text-[10px] bg-muted px-2 py-0.5 rounded">Inativo</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {data.toLocaleDateString("pt-PT")} {data.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
                    {j.competicao && ` • ${j.competicao}`} • {j.odds_casas.length} casas
                  </p>
                </button>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEditJogo(j)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => delJogo(j.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => setExpanded(s => ({ ...s, [j.id]: !s[j.id] }))}>
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {isOpen && (
                <div className="mt-3 space-y-2 border-t pt-3">
                  {j.odds_casas.map((o) => (
                    <div key={o.id} className="flex items-center justify-between bg-muted/30 rounded p-2">
                      <div className="text-xs">
                        <p className="font-medium">{o.casa_aposta}</p>
                        <p className="text-muted-foreground">
                          {o.odd_casa ?? "—"} | {o.odd_empate ?? "—"} | {o.odd_fora ?? "—"}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEditOdd(j.id, o)}><Pencil className="w-3 h-3" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => delOdd(o.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                      </div>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" className="w-full" onClick={() => openNewOdd(j.id)}>
                    <Plus className="w-3 h-3 mr-1" /> Adicionar casa
                  </Button>
                </div>
              )}
            </Card>
          );
        })
      )}

      <Dialog open={jogoDialog} onOpenChange={setJogoDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editJogoId ? "Editar jogo" : "Novo jogo"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Equipa casa</Label><Input value={jogoForm.equipa_casa} onChange={e => setJogoForm(f => ({ ...f, equipa_casa: e.target.value }))} /></div>
              <div><Label>Equipa fora</Label><Input value={jogoForm.equipa_fora} onChange={e => setJogoForm(f => ({ ...f, equipa_fora: e.target.value }))} /></div>
            </div>
            <div><Label>Competição</Label><Input value={jogoForm.competicao} onChange={e => setJogoForm(f => ({ ...f, competicao: e.target.value }))} placeholder="Liga BAI, CAN..." /></div>
            <div><Label>Data e hora</Label><Input type="datetime-local" value={jogoForm.data_inicio} onChange={e => setJogoForm(f => ({ ...f, data_inicio: e.target.value }))} /></div>
            <div className="flex items-center gap-2"><Switch checked={jogoForm.ativo} onCheckedChange={v => setJogoForm(f => ({ ...f, ativo: v }))} /><Label>Ativo</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJogoDialog(false)}>Cancelar</Button>
            <Button onClick={saveJogo} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={oddDialog.open} onOpenChange={(o) => setOddDialog(s => ({ ...s, open: o }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>{oddDialog.oddId ? "Editar odd" : "Nova odd"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Casa de apostas</Label><Input value={oddForm.casa_aposta} onChange={e => setOddForm(f => ({ ...f, casa_aposta: e.target.value }))} placeholder="Elephant Bet" /></div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>Casa</Label><Input type="number" step="0.01" value={oddForm.odd_casa} onChange={e => setOddForm(f => ({ ...f, odd_casa: e.target.value }))} /></div>
              <div><Label>Empate</Label><Input type="number" step="0.01" value={oddForm.odd_empate} onChange={e => setOddForm(f => ({ ...f, odd_empate: e.target.value }))} /></div>
              <div><Label>Fora</Label><Input type="number" step="0.01" value={oddForm.odd_fora} onChange={e => setOddForm(f => ({ ...f, odd_fora: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOddDialog({ open: false, jogoId: null, oddId: null })}>Cancelar</Button>
            <Button onClick={saveOdd} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
