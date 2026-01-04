import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Loader2, 
  Plus, 
  Edit2, 
  Trash2,
  TrendingUp,
  DollarSign,
  Calendar,
  Percent,
  CheckCircle
} from 'lucide-react';

interface Plano {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  limite_construcoes: number;
  limite_jogos: number;
  acesso_mercados_avancados: boolean;
  verificacao_automatica: boolean;
  created_at: string;
}

export const PlansManagement = () => {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Plano | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    nome: '',
    descricao: '',
    preco: '',
    limite_construcoes: '',
    limite_jogos: '',
    acesso_mercados_avancados: false,
    verificacao_automatica: false
  });

  useEffect(() => {
    fetchPlanos();
  }, []);

  const fetchPlanos = async () => {
    try {
      const { data, error } = await supabase
        .from('planos')
        .select('*')
        .order('preco', { ascending: true });

      if (error) throw error;
      setPlanos(data || []);
    } catch (error) {
      console.error('Error fetching planos:', error);
      toast.error('Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      nome: '',
      descricao: '',
      preco: '',
      limite_construcoes: '',
      limite_jogos: '',
      acesso_mercados_avancados: false,
      verificacao_automatica: false
    });
  };

  const openEdit = (plano: Plano) => {
    setEditing(plano);
    setForm({
      nome: plano.nome,
      descricao: plano.descricao || '',
      preco: plano.preco.toString(),
      limite_construcoes: plano.limite_construcoes.toString(),
      limite_jogos: plano.limite_jogos.toString(),
      acesso_mercados_avancados: plano.acesso_mercados_avancados,
      verificacao_automatica: plano.verificacao_automatica
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim() || !form.preco) {
      toast.error('Nome e preço são obrigatórios');
      return;
    }

    setSaving(true);
    try {
      const data = {
        nome: form.nome,
        descricao: form.descricao || null,
        preco: parseFloat(form.preco),
        limite_construcoes: parseInt(form.limite_construcoes) || 0,
        limite_jogos: parseInt(form.limite_jogos) || 0,
        acesso_mercados_avancados: form.acesso_mercados_avancados,
        verificacao_automatica: form.verificacao_automatica
      };

      if (editing) {
        const { error } = await supabase
          .from('planos')
          .update(data)
          .eq('id', editing.id);
        if (error) throw error;
        toast.success('Plano atualizado!');
      } else {
        const { error } = await supabase.from('planos').insert(data);
        if (error) throw error;
        toast.success('Plano criado!');
      }

      setShowModal(false);
      setEditing(null);
      resetForm();
      fetchPlanos();
    } catch (error) {
      console.error('Error saving plano:', error);
      toast.error('Erro ao salvar plano');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este plano?')) return;
    
    try {
      const { error } = await supabase.from('planos').delete().eq('id', id);
      if (error) throw error;
      toast.success('Plano excluído!');
      fetchPlanos();
    } catch (error) {
      console.error('Error deleting plano:', error);
      toast.error('Erro ao excluir plano');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-primary" />
            <div>
              <p className="text-xs text-primary/70">Total Planos</p>
              <p className="text-2xl font-bold text-primary">{planos.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-green-400" />
            <div>
              <p className="text-xs text-green-400/70">Maior Preço</p>
              <p className="text-lg font-bold text-green-400">
                {Math.max(...planos.map(p => p.preco), 0).toLocaleString()} Kz
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => {
            resetForm();
            setEditing(null);
            setShowModal(true);
          }}
        >
          <Plus className="w-4 h-4 mr-1" /> Novo Plano
        </Button>
      </div>

      {/* Planos List */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Planos ({planos.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {planos.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum plano cadastrado</p>
          ) : (
            planos.map((plano) => (
              <Card key={plano.id} className="bg-background/50 border-border/30">
                <CardContent className="p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-sm">{plano.nome}</p>
                      <p className="text-xs text-muted-foreground">{plano.descricao}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(plano)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDelete(plano.id)}
                        className="text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-primary/20 text-primary border-primary/30">
                      <DollarSign className="w-3 h-3 mr-0.5" />
                      {plano.preco.toLocaleString()} Kz
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-background/50 rounded p-2">
                      <span className="text-muted-foreground">Construções:</span>
                      <span className="ml-1 font-medium">{plano.limite_construcoes}</span>
                    </div>
                    <div className="bg-background/50 rounded p-2">
                      <span className="text-muted-foreground">Jogos:</span>
                      <span className="ml-1 font-medium">{plano.limite_jogos}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-2">
                    {plano.acesso_mercados_avancados && (
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle className="w-3 h-3 mr-0.5" /> Mercados Avançados
                      </Badge>
                    )}
                    {plano.verificacao_automatica && (
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle className="w-3 h-3 mr-0.5" /> Verificação Automática
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Plano' : 'Novo Plano'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Nome *</label>
              <Input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Descrição</label>
              <Input
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Preço (Kz) *</label>
              <Input
                type="number"
                value={form.preco}
                onChange={(e) => setForm({ ...form, preco: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Limite Construções</label>
                <Input
                  type="number"
                  value={form.limite_construcoes}
                  onChange={(e) => setForm({ ...form, limite_construcoes: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Limite Jogos</label>
                <Input
                  type="number"
                  value={form.limite_jogos}
                  onChange={(e) => setForm({ ...form, limite_jogos: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm">Mercados Avançados</label>
              <Switch
                checked={form.acesso_mercados_avancados}
                onCheckedChange={(checked) => setForm({ ...form, acesso_mercados_avancados: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm">Verificação Automática</label>
              <Switch
                checked={form.verificacao_automatica}
                onCheckedChange={(checked) => setForm({ ...form, verificacao_automatica: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
