import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Star, Trash2, Edit2 } from "lucide-react";

interface Avaliacao {
  id: string;
  user_id: string;
  nota: number;
  comentario: string | null;
  created_at: string;
  nome_usuario?: string;
  avatar_url?: string;
}

interface Props {
  artistaId: string;
}

export function ArtistaAvaliacoes({ artistaId }: Props) {
  const { toast } = useToast();
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [hoverStar, setHoverStar] = useState(0);

  useEffect(() => {
    loadData();
  }, [artistaId]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);

      const { data } = await supabase
        .from("artista_avaliacoes")
        .select("*")
        .eq("artista_id", artistaId)
        .order("created_at", { ascending: false });

      if (!data) { setLoading(false); return; }

      // Enrich with profile names
      const userIds = [...new Set(data.map(a => a.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, nome_completo, avatar_url")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const enriched: Avaliacao[] = data.map(a => ({
        ...a,
        nome_usuario: profileMap.get(a.user_id)?.nome_completo || "Utilizador",
        avatar_url: profileMap.get(a.user_id)?.avatar_url || undefined,
      }));

      setAvaliacoes(enriched);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!userId) {
      toast({ title: "Faça login para avaliar", variant: "destructive" });
      return;
    }
    if (nota < 1 || nota > 5) {
      toast({ title: "Selecione uma nota de 1 a 5", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        artista_id: artistaId,
        user_id: userId,
        nota,
        comentario: comentario.trim() || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from("artista_avaliacoes")
          .update({ nota, comentario: comentario.trim() || null, updated_at: new Date().toISOString() })
          .eq("id", editingId);
        if (error) throw error;
        toast({ title: "Avaliação atualizada!" });
      } else {
        const { error } = await supabase
          .from("artista_avaliacoes")
          .insert(payload);
        if (error) {
          if (error.code === "23505") {
            toast({ title: "Já avaliou este artista. Edite a sua avaliação.", variant: "destructive" });
          } else throw error;
          setSubmitting(false);
          return;
        }
        toast({ title: "Avaliação enviada!" });
      }

      setNota(0);
      setComentario("");
      setEditingId(null);
      await loadData();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (av: Avaliacao) => {
    setEditingId(av.id);
    setNota(av.nota);
    setComentario(av.comentario || "");
  };

  const handleDelete = async (id: string) => {
    try {
      await supabase.from("artista_avaliacoes").delete().eq("id", id);
      toast({ title: "Avaliação removida" });
      await loadData();
    } catch (err: any) {
      toast({ title: "Erro", variant: "destructive" });
    }
  };

  const avgNota = avaliacoes.length > 0
    ? (avaliacoes.reduce((s, a) => s + a.nota, 0) / avaliacoes.length).toFixed(1)
    : null;

  const myReview = avaliacoes.find(a => a.user_id === userId);

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
          Avaliações
        </h2>
        {avgNota && (
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-foreground">{avgNota}</span>
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span className="text-xs text-muted-foreground">({avaliacoes.length})</span>
          </div>
        )}
      </div>

      {/* Form */}
      {userId && !myReview && !editingId && (
        <div className="bg-card rounded-xl border border-border p-3 space-y-3">
          <p className="text-sm font-semibold text-foreground">Deixe a sua avaliação</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(s => (
              <button
                key={s}
                onMouseEnter={() => setHoverStar(s)}
                onMouseLeave={() => setHoverStar(0)}
                onClick={() => setNota(s)}
                className="p-0.5"
              >
                <Star
                  className={`w-6 h-6 transition-colors ${
                    s <= (hoverStar || nota)
                      ? "text-yellow-500 fill-yellow-500"
                      : "text-muted-foreground"
                  }`}
                />
              </button>
            ))}
          </div>
          <Textarea
            value={comentario}
            onChange={e => setComentario(e.target.value)}
            placeholder="Comentário (opcional)..."
            className="rounded-xl text-sm"
            rows={2}
            maxLength={500}
          />
          <Button onClick={handleSubmit} disabled={submitting} size="sm" className="rounded-xl gap-1.5">
            {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
            Enviar
          </Button>
        </div>
      )}

      {/* Edit form */}
      {editingId && (
        <div className="bg-card rounded-xl border border-border p-3 space-y-3">
          <p className="text-sm font-semibold text-foreground">Editar avaliação</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(s => (
              <button
                key={s}
                onMouseEnter={() => setHoverStar(s)}
                onMouseLeave={() => setHoverStar(0)}
                onClick={() => setNota(s)}
                className="p-0.5"
              >
                <Star
                  className={`w-6 h-6 transition-colors ${
                    s <= (hoverStar || nota)
                      ? "text-yellow-500 fill-yellow-500"
                      : "text-muted-foreground"
                  }`}
                />
              </button>
            ))}
          </div>
          <Textarea
            value={comentario}
            onChange={e => setComentario(e.target.value)}
            placeholder="Comentário (opcional)..."
            className="rounded-xl text-sm"
            rows={2}
            maxLength={500}
          />
          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={submitting} size="sm" className="rounded-xl gap-1.5">
              {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
              Guardar
            </Button>
            <Button onClick={() => { setEditingId(null); setNota(0); setComentario(""); }} variant="outline" size="sm" className="rounded-xl">
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : avaliacoes.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Ainda sem avaliações</p>
      ) : (
        <div className="space-y-3">
          {avaliacoes.map(av => (
            <div key={av.id} className="bg-card rounded-xl border border-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                    {av.avatar_url ? (
                      <img src={av.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-muted-foreground">
                        {(av.nome_usuario || "U")[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{av.nome_usuario}</p>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star
                          key={s}
                          className={`w-3 h-3 ${s <= av.nota ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                {av.user_id === userId && !editingId && (
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(av)} className="p-1 text-muted-foreground hover:text-foreground">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(av.id)} className="p-1 text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              {av.comentario && (
                <p className="text-xs text-muted-foreground leading-relaxed">{av.comentario}</p>
              )}
              <p className="text-[10px] text-muted-foreground/60">
                {new Date(av.created_at).toLocaleDateString("pt-AO")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
