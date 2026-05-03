import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, ArrowLeft, Building2, Calendar } from "lucide-react";

interface CasaAposta {
  id: string;
  nome: string;
  logo_url: string | null;
  ativo: boolean;
}

interface OddCasa {
  id: string;
  jogo_id: string;
  casa_aposta: string;
  odd_casa: number | null;
  odd_empate: number | null;
  odd_fora: number | null;
  odd_over_25: number | null;
  odd_under_25: number | null;
  odd_btts_sim: number | null;
  odd_btts_nao: number | null;
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

const emptyCasa = { nome: "", logo_url: "", ativo: true };
const emptyJogo = {
  equipa_casa: "", equipa_fora: "", competicao: "", data_inicio: "", ativo: true,
  odd_casa: "", odd_empate: "", odd_fora: "",
  odd_over_25: "", odd_under_25: "", odd_btts_sim: "", odd_btts_nao: "",
};

export const OddsManagement = () => {
  const [casas, setCasas] = useState<CasaAposta[]>([]);
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCasa, setSelectedCasa] = useState<CasaAposta | null>(null);

  // Casa dialog
  const [casaDialog, setCasaDialog] = useState(false);
  const [editCasaId, setEditCasaId] = useState<string | null>(null);
  const [casaForm, setCasaForm] = useState(emptyCasa);

  // Jogo+Odd dialog
  const [jogoDialog, setJogoDialog] = useState(false);
  const [editJogo, setEditJogo] = useState<{ jogoId: string; oddId: string | null } | null>(null);
  const [jogoForm, setJogoForm] = useState(emptyJogo);

  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [c, j] = await Promise.all([
      supabase.from("casas_apostas").select("*").order("ordem", { ascending: true }).order("nome"),
      supabase.from("odds_jogos").select("*, odds_casas(*)").order("data_inicio", { ascending: true }),
    ]);
    setCasas((c.data as any) || []);
    setJogos((j.data as any) || []);
    setLoading(false);
  };

  // ── Casa CRUD ──────────────────────────────────────────────
  const openNewCasa = () => { setEditCasaId(null); setCasaForm(emptyCasa); setCasaDialog(true); };
  const openEditCasa = (c: CasaAposta) => {
    setEditCasaId(c.id);
    setCasaForm({ nome: c.nome, logo_url: c.logo_url || "", ativo: c.ativo });
    setCasaDialog(true);
  };
  const saveCasa = async () => {
    if (!casaForm.nome.trim()) { toast.error("Nome obrigatório"); return; }
    setSaving(true);
    const payload = { nome: casaForm.nome.trim(), logo_url: casaForm.logo_url || null, ativo: casaForm.ativo };
    const { error } = editCasaId
      ? await supabase.from("casas_apostas").update(payload).eq("id", editCasaId)
      : await supabase.from("casas_apostas").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editCasaId ? "Casa atualizada" : "Casa criada");
    setCasaDialog(false);
    load();
  };
  const delCasa = async (c: CasaAposta) => {
    const usadas = jogos.some(j => j.odds_casas.some(o => o.casa_aposta === c.nome));
    if (usadas && !confirm("Esta casa tem odds registadas em jogos. Eliminar mesmo assim? (As odds permanecem mas a casa não aparecerá na lista)")) return;
    if (!usadas && !confirm("Eliminar esta casa de apostas?")) return;
    const { error } = await supabase.from("casas_apostas").delete().eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Casa eliminada"); load();
  };

  // ── Jogo + Odd (combinado) ─────────────────────────────────
  const openNewJogo = () => {
    setEditJogo(null);
    setJogoForm(emptyJogo);
    setJogoDialog(true);
  };
  const openEditJogo = (j: Jogo) => {
    if (!selectedCasa) return;
    const odd = j.odds_casas.find(o => o.casa_aposta === selectedCasa.nome);
    setEditJogo({ jogoId: j.id, oddId: odd?.id ?? null });
    setJogoForm({
      equipa_casa: j.equipa_casa,
      equipa_fora: j.equipa_fora,
      competicao: j.competicao || "",
      data_inicio: new Date(j.data_inicio).toISOString().slice(0, 16),
      ativo: j.ativo,
      odd_casa: odd?.odd_casa?.toString() ?? "",
      odd_empate: odd?.odd_empate?.toString() ?? "",
      odd_fora: odd?.odd_fora?.toString() ?? "",
      odd_over_25: odd?.odd_over_25?.toString() ?? "",
      odd_under_25: odd?.odd_under_25?.toString() ?? "",
      odd_btts_sim: odd?.odd_btts_sim?.toString() ?? "",
      odd_btts_nao: odd?.odd_btts_nao?.toString() ?? "",
    });
    setJogoDialog(true);
  };

  const saveJogo = async () => {
    if (!selectedCasa) return;
    if (!jogoForm.equipa_casa || !jogoForm.equipa_fora || !jogoForm.data_inicio) {
      toast.error("Preencha equipas e data"); return;
    }
    if (!jogoForm.odd_casa && !jogoForm.odd_empate && !jogoForm.odd_fora) {
      toast.error("Preencha pelo menos uma odd"); return;
    }
    setSaving(true);

    const jogoPayload = {
      equipa_casa: jogoForm.equipa_casa.trim(),
      equipa_fora: jogoForm.equipa_fora.trim(),
      competicao: jogoForm.competicao || null,
      data_inicio: new Date(jogoForm.data_inicio).toISOString(),
      ativo: jogoForm.ativo,
    };

    let jogoId = editJogo?.jogoId ?? null;
    if (jogoId) {
      const { error } = await supabase.from("odds_jogos").update(jogoPayload).eq("id", jogoId);
      if (error) { setSaving(false); toast.error(error.message); return; }
    } else {
      const { data, error } = await supabase.from("odds_jogos").insert(jogoPayload).select("id").single();
      if (error || !data) { setSaving(false); toast.error(error?.message || "Erro"); return; }
      jogoId = data.id;
    }

    const oddPayload = {
      jogo_id: jogoId!,
      casa_aposta: selectedCasa.nome,
      odd_casa: jogoForm.odd_casa ? Number(jogoForm.odd_casa) : null,
      odd_empate: jogoForm.odd_empate ? Number(jogoForm.odd_empate) : null,
      odd_fora: jogoForm.odd_fora ? Number(jogoForm.odd_fora) : null,
      odd_over_25: jogoForm.odd_over_25 ? Number(jogoForm.odd_over_25) : null,
      odd_under_25: jogoForm.odd_under_25 ? Number(jogoForm.odd_under_25) : null,
      odd_btts_sim: jogoForm.odd_btts_sim ? Number(jogoForm.odd_btts_sim) : null,
      odd_btts_nao: jogoForm.odd_btts_nao ? Number(jogoForm.odd_btts_nao) : null,
    };
    const { error: oddErr } = editJogo?.oddId
      ? await supabase.from("odds_casas").update(oddPayload).eq("id", editJogo.oddId)
      : await supabase.from("odds_casas").insert(oddPayload);

    setSaving(false);
    if (oddErr) { toast.error(oddErr.message); return; }
    toast.success(editJogo ? "Jogo atualizado" : "Jogo criado");
    setJogoDialog(false);
    load();
  };

  const delJogoOdd = async (j: Jogo) => {
    if (!selectedCasa) return;
    const odd = j.odds_casas.find(o => o.casa_aposta === selectedCasa.nome);
    if (!odd) return;
    if (!confirm(`Remover odds desta casa para o jogo ${j.equipa_casa} vs ${j.equipa_fora}?`)) return;
    const { error } = await supabase.from("odds_casas").delete().eq("id", odd.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Odd removida"); load();
  };

  const jogosDaCasa = useMemo(() => {
    if (!selectedCasa) return [];
    return jogos
      .map(j => ({ jogo: j, odd: j.odds_casas.find(o => o.casa_aposta === selectedCasa.nome) || null }))
      .filter(x => x.odd !== null);
  }, [jogos, selectedCasa]);

  if (loading) {
    return <div className="flex justify-center p-6"><Loader2 className="w-5 h-5 animate-spin text-white" /></div>;
  }

  // ── VISTA: Detalhe de uma casa ─────────────────────────────
  if (selectedCasa) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSelectedCasa(null)} className="gap-1 -ml-2">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
          <Button size="sm" onClick={openNewJogo}><Plus className="w-4 h-4 mr-1" /> Novo jogo</Button>
        </div>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            {selectedCasa.logo_url ? (
              <img src={selectedCasa.logo_url} alt={selectedCasa.nome} className="w-12 h-12 rounded-lg object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
            )}
            <div>
              <h3 className="font-bold text-lg">{selectedCasa.nome}</h3>
              <p className="text-xs text-muted-foreground">{jogosDaCasa.length} jogo{jogosDaCasa.length !== 1 ? "s" : ""} cadastrado{jogosDaCasa.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
        </Card>

        {jogosDaCasa.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground text-sm">
            Nenhum jogo cadastrado para esta casa. Clique em "Novo jogo" para adicionar.
          </Card>
        ) : (
          jogosDaCasa.map(({ jogo, odd }) => {
            const data = new Date(jogo.data_inicio);
            return (
              <Card key={jogo.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm flex items-center gap-2">
                      {jogo.equipa_casa} vs {jogo.equipa_fora}
                      {!jogo.ativo && <span className="text-[10px] bg-muted px-2 py-0.5 rounded">Inativo</span>}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      {data.toLocaleDateString("pt-PT")} {data.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
                      {jogo.competicao && ` • ${jogo.competicao}`}
                    </p>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <OddBox label={jogo.equipa_casa.slice(0, 10)} value={odd?.odd_casa} />
                      <OddBox label="Empate" value={odd?.odd_empate} />
                      <OddBox label={jogo.equipa_fora.slice(0, 10)} value={odd?.odd_fora} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEditJogo(jogo)}><Pencil className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => delJogoOdd(jogo)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}

        {/* Dialog: jogo + odds */}
        <Dialog open={jogoDialog} onOpenChange={setJogoDialog}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editJogo ? "Editar jogo" : "Novo jogo"} — {selectedCasa.nome}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Equipa casa</Label><Input value={jogoForm.equipa_casa} onChange={e => setJogoForm(f => ({ ...f, equipa_casa: e.target.value }))} placeholder="Benfica" /></div>
                <div><Label>Equipa fora</Label><Input value={jogoForm.equipa_fora} onChange={e => setJogoForm(f => ({ ...f, equipa_fora: e.target.value }))} placeholder="Porto" /></div>
              </div>
              <div><Label>Competição</Label><Input value={jogoForm.competicao} onChange={e => setJogoForm(f => ({ ...f, competicao: e.target.value }))} placeholder="Liga BAI, CAN..." /></div>
              <div><Label>Data e hora</Label><Input type="datetime-local" value={jogoForm.data_inicio} onChange={e => setJogoForm(f => ({ ...f, data_inicio: e.target.value }))} /></div>

              <div className="border-t pt-3">
                <Label className="text-xs uppercase text-muted-foreground">Odds nesta casa ({selectedCasa.nome})</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div>
                    <Label className="text-xs">{jogoForm.equipa_casa || "Casa"}</Label>
                    <Input type="number" step="0.01" value={jogoForm.odd_casa} onChange={e => setJogoForm(f => ({ ...f, odd_casa: e.target.value }))} placeholder="1.85" />
                  </div>
                  <div>
                    <Label className="text-xs">Empate</Label>
                    <Input type="number" step="0.01" value={jogoForm.odd_empate} onChange={e => setJogoForm(f => ({ ...f, odd_empate: e.target.value }))} placeholder="3.20" />
                  </div>
                  <div>
                    <Label className="text-xs">{jogoForm.equipa_fora || "Fora"}</Label>
                    <Input type="number" step="0.01" value={jogoForm.odd_fora} onChange={e => setJogoForm(f => ({ ...f, odd_fora: e.target.value }))} placeholder="4.50" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={jogoForm.ativo} onCheckedChange={v => setJogoForm(f => ({ ...f, ativo: v }))} />
                <Label>Jogo ativo (visível aos utilizadores)</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setJogoDialog(false)}>Cancelar</Button>
              <Button onClick={saveJogo} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── VISTA: Lista de casas ──────────────────────────────────
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Casas de Apostas</h3>
        <Button size="sm" onClick={openNewCasa}><Plus className="w-4 h-4 mr-1" /> Nova casa</Button>
      </div>

      {casas.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground text-sm">
          Nenhuma casa de apostas cadastrada. Crie uma (ex: Elephant Bet, Betano) para começar a registar jogos.
        </Card>
      ) : (
        casas.map((c) => {
          const total = jogos.filter(j => j.odds_casas.some(o => o.casa_aposta === c.nome)).length;
          return (
            <Card key={c.id} className="p-3 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <button className="flex-1 flex items-center gap-3 text-left" onClick={() => setSelectedCasa(c)}>
                  {c.logo_url ? (
                    <img src={c.logo_url} alt={c.nome} className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold flex items-center gap-2">
                      {c.nome}
                      {!c.ativo && <span className="text-[10px] bg-muted px-2 py-0.5 rounded">Inativa</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{total} jogo{total !== 1 ? "s" : ""}</p>
                  </div>
                </button>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEditCasa(c)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => delCasa(c)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </div>
            </Card>
          );
        })
      )}

      <Dialog open={casaDialog} onOpenChange={setCasaDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editCasaId ? "Editar casa" : "Nova casa de apostas"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={casaForm.nome} onChange={e => setCasaForm(f => ({ ...f, nome: e.target.value }))} placeholder="Elephant Bet" /></div>
            <div><Label>Logo URL (opcional)</Label><Input value={casaForm.logo_url} onChange={e => setCasaForm(f => ({ ...f, logo_url: e.target.value }))} placeholder="https://..." /></div>
            <div className="flex items-center gap-2"><Switch checked={casaForm.ativo} onCheckedChange={v => setCasaForm(f => ({ ...f, ativo: v }))} /><Label>Ativa</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCasaDialog(false)}>Cancelar</Button>
            <Button onClick={saveCasa} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function OddBox({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div className="bg-muted/40 rounded-lg p-1.5 text-center">
      <p className="text-[9px] uppercase text-muted-foreground truncate">{label}</p>
      <p className="text-sm font-bold">{value ?? "—"}</p>
    </div>
  );
}
