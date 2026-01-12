import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Settings, 
  DollarSign, 
  Image, 
  CreditCard,
  Save,
  Loader2,
  Plus,
  Trash2,
  Edit2,
  GripVertical
} from 'lucide-react';

interface Configuracao {
  id: string;
  chave: string;
  valor: string | null;
  descricao: string | null;
}

interface Banner {
  id: string;
  titulo: string | null;
  descricao: string | null;
  imagem_url: string;
  link: string | null;
  ordem: number;
  ativo: boolean;
  duracao_segundos: number;
}

interface MetodoDeposito {
  id: string;
  nome: string;
  tipo: string;
  iban: string | null;
  numero_express: string | null;
  titular_conta: string | null;
  ativo: boolean;
  ordem: number;
}

export const SystemSettings = () => {
  const [configuracoes, setConfiguracoes] = useState<Configuracao[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [metodos, setMetodos] = useState<MetodoDeposito[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('precos');

  // Form states
  const [editedConfigs, setEditedConfigs] = useState<Record<string, string>>({});
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [showMetodoModal, setShowMetodoModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [editingMetodo, setEditingMetodo] = useState<MetodoDeposito | null>(null);

  // Banner form
  const [bannerForm, setBannerForm] = useState({
    titulo: '',
    descricao: '',
    imagem_url: '',
    link: '',
    ordem: 0,
    ativo: true,
    duracao_segundos: 5
  });

  // Metodo form
  const [metodoForm, setMetodoForm] = useState({
    nome: '',
    tipo: 'banco',
    iban: '',
    numero_express: '',
    titular_conta: '',
    ativo: true,
    ordem: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [configsRes, bannersRes, metodosRes] = await Promise.all([
        supabase.from('configuracoes_sistema').select('*'),
        supabase.from('banners').select('*').order('ordem'),
        supabase.from('metodos_deposito').select('*').order('ordem')
      ]);

      if (configsRes.data) {
        setConfiguracoes(configsRes.data);
        const initialValues: Record<string, string> = {};
        configsRes.data.forEach(c => {
          initialValues[c.chave] = c.valor || '';
        });
        setEditedConfigs(initialValues);
      }

      if (bannersRes.data) setBanners(bannersRes.data);
      if (metodosRes.data) setMetodos(metodosRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfigs = async () => {
    setSaving(true);
    try {
      for (const config of configuracoes) {
        if (editedConfigs[config.chave] !== config.valor) {
          await supabase
            .from('configuracoes_sistema')
            .update({ valor: editedConfigs[config.chave], updated_at: new Date().toISOString() })
            .eq('id', config.id);
        }
      }
      toast.success('Configurações salvas!');
      fetchData();
    } catch (error) {
      console.error('Error saving configs:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBanner = async () => {
    setSaving(true);
    try {
      if (editingBanner) {
        await supabase
          .from('banners')
          .update({ ...bannerForm, updated_at: new Date().toISOString() })
          .eq('id', editingBanner.id);
        toast.success('Banner atualizado!');
      } else {
        await supabase.from('banners').insert(bannerForm);
        toast.success('Banner criado!');
      }
      setShowBannerModal(false);
      setEditingBanner(null);
      setBannerForm({ titulo: '', descricao: '', imagem_url: '', link: '', ordem: 0, ativo: true, duracao_segundos: 5 });
      fetchData();
    } catch (error) {
      console.error('Error saving banner:', error);
      toast.error('Erro ao salvar banner');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este banner?')) return;
    try {
      await supabase.from('banners').delete().eq('id', id);
      toast.success('Banner excluído!');
      fetchData();
    } catch (error) {
      console.error('Error deleting banner:', error);
      toast.error('Erro ao excluir banner');
    }
  };

  const handleSaveMetodo = async () => {
    setSaving(true);
    try {
      if (editingMetodo) {
        await supabase
          .from('metodos_deposito')
          .update(metodoForm)
          .eq('id', editingMetodo.id);
        toast.success('Método atualizado!');
      } else {
        await supabase.from('metodos_deposito').insert(metodoForm);
        toast.success('Método criado!');
      }
      setShowMetodoModal(false);
      setEditingMetodo(null);
      setMetodoForm({ nome: '', tipo: 'banco', iban: '', numero_express: '', titular_conta: '', ativo: true, ordem: 0 });
      fetchData();
    } catch (error) {
      console.error('Error saving metodo:', error);
      toast.error('Erro ao salvar método');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleMetodo = async (metodo: MetodoDeposito) => {
    try {
      await supabase
        .from('metodos_deposito')
        .update({ ativo: !metodo.ativo })
        .eq('id', metodo.id);
      fetchData();
    } catch (error) {
      console.error('Error toggling metodo:', error);
    }
  };

  const handleToggleBanner = async (banner: Banner) => {
    try {
      await supabase
        .from('banners')
        .update({ ativo: !banner.ativo })
        .eq('id', banner.id);
      fetchData();
    } catch (error) {
      console.error('Error toggling banner:', error);
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
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-3 mb-4">
          <TabsTrigger value="precos" className="text-xs">
            <DollarSign className="w-3.5 h-3.5 mr-1" />
            Preços
          </TabsTrigger>
          <TabsTrigger value="banners" className="text-xs">
            <Image className="w-3.5 h-3.5 mr-1" />
            Banners
          </TabsTrigger>
          <TabsTrigger value="depositos" className="text-xs">
            <CreditCard className="w-3.5 h-3.5 mr-1" />
            Depósitos
          </TabsTrigger>
        </TabsList>

        {/* Preços Tab */}
        <TabsContent value="precos" className="space-y-4">
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Configurações de Preços e Limites
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {configuracoes.map((config) => (
                <div key={config.id}>
                  <label className="text-sm text-muted-foreground mb-1 block">
                    {config.descricao}
                  </label>
                  <Input
                    type="number"
                    value={editedConfigs[config.chave] || ''}
                    onChange={(e) => setEditedConfigs({ ...editedConfigs, [config.chave]: e.target.value })}
                  />
                </div>
              ))}
              
              <Button onClick={handleSaveConfigs} disabled={saving} className="w-full">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar Configurações
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Banners Tab */}
        <TabsContent value="banners" className="space-y-4">
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => {
                setBannerForm({ titulo: '', descricao: '', imagem_url: '', link: '', ordem: banners.length, ativo: true, duracao_segundos: 5 });
                setEditingBanner(null);
                setShowBannerModal(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1" /> Novo Banner
            </Button>
          </div>

          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardContent className="p-4 space-y-2">
              {banners.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum banner cadastrado</p>
              ) : (
                banners.map((banner) => (
                  <Card key={banner.id} className="bg-background/50 border-border/30">
                    <CardContent className="p-3 flex items-center gap-3">
                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                      <img
                        src={banner.imagem_url}
                        alt={banner.titulo || 'Banner'}
                        className="w-16 h-10 object-cover rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{banner.titulo || 'Sem título'}</p>
                        <p className="text-xs text-muted-foreground">Ordem: {banner.ordem} | Duração: {banner.duracao_segundos || 5}s</p>
                      </div>
                      <Switch
                        checked={banner.ativo}
                        onCheckedChange={() => handleToggleBanner(banner)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingBanner(banner);
                          setBannerForm({
                            titulo: banner.titulo || '',
                            descricao: banner.descricao || '',
                            imagem_url: banner.imagem_url,
                            link: banner.link || '',
                            ordem: banner.ordem,
                            ativo: banner.ativo,
                            duracao_segundos: banner.duracao_segundos || 5
                          });
                          setShowBannerModal(true);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteBanner(banner.id)}
                        className="text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Depósitos Tab */}
        <TabsContent value="depositos" className="space-y-4">
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => {
                setMetodoForm({ nome: '', tipo: 'banco', iban: '', numero_express: '', titular_conta: '', ativo: true, ordem: metodos.length });
                setEditingMetodo(null);
                setShowMetodoModal(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1" /> Novo Método
            </Button>
          </div>

          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardContent className="p-4 space-y-2">
              {metodos.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum método cadastrado</p>
              ) : (
                metodos.map((metodo) => (
                  <Card key={metodo.id} className="bg-background/50 border-border/30">
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{metodo.nome}</p>
                        {metodo.titular_conta && (
                          <p className="text-xs text-primary">Titular: {metodo.titular_conta}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {metodo.tipo === 'banco' ? `IBAN: ${metodo.iban}` : `Express: ${metodo.numero_express}`}
                        </p>
                      </div>
                      <Switch
                        checked={metodo.ativo}
                        onCheckedChange={() => handleToggleMetodo(metodo)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingMetodo(metodo);
                          setMetodoForm({
                            nome: metodo.nome,
                            tipo: metodo.tipo,
                            iban: metodo.iban || '',
                            numero_express: metodo.numero_express || '',
                            titular_conta: metodo.titular_conta || '',
                            ativo: metodo.ativo,
                            ordem: metodo.ordem
                          });
                          setShowMetodoModal(true);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Banner Modal */}
      <Dialog open={showBannerModal} onOpenChange={setShowBannerModal}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>{editingBanner ? 'Editar Banner' : 'Novo Banner'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Título</label>
              <Input
                value={bannerForm.titulo}
                onChange={(e) => setBannerForm({ ...bannerForm, titulo: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">URL da Imagem *</label>
              <Input
                value={bannerForm.imagem_url}
                onChange={(e) => setBannerForm({ ...bannerForm, imagem_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Link (opcional)</label>
              <Input
                value={bannerForm.link}
                onChange={(e) => setBannerForm({ ...bannerForm, link: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Ordem</label>
                <Input
                  type="number"
                  value={bannerForm.ordem}
                  onChange={(e) => setBannerForm({ ...bannerForm, ordem: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Duração (segundos)</label>
                <Input
                  type="number"
                  min="1"
                  max="30"
                  value={bannerForm.duracao_segundos}
                  onChange={(e) => setBannerForm({ ...bannerForm, duracao_segundos: parseInt(e.target.value) || 5 })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBannerModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveBanner} disabled={saving || !bannerForm.imagem_url}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Método Modal */}
      <Dialog open={showMetodoModal} onOpenChange={setShowMetodoModal}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>{editingMetodo ? 'Editar Método' : 'Novo Método'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Nome do Banco/Serviço *</label>
              <Input
                value={metodoForm.nome}
                onChange={(e) => setMetodoForm({ ...metodoForm, nome: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Nome do Titular da Conta</label>
              <Input
                value={metodoForm.titular_conta}
                onChange={(e) => setMetodoForm({ ...metodoForm, titular_conta: e.target.value })}
                placeholder="Nome completo do titular"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Tipo</label>
              <select
                value={metodoForm.tipo}
                onChange={(e) => setMetodoForm({ ...metodoForm, tipo: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="banco">Banco (IBAN)</option>
                <option value="express">Multicaixa Express</option>
              </select>
            </div>
            {metodoForm.tipo === 'banco' ? (
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">IBAN</label>
                <Input
                  value={metodoForm.iban}
                  onChange={(e) => setMetodoForm({ ...metodoForm, iban: e.target.value })}
                />
              </div>
            ) : (
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Número Express</label>
                <Input
                  value={metodoForm.numero_express}
                  onChange={(e) => setMetodoForm({ ...metodoForm, numero_express: e.target.value })}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMetodoModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveMetodo} disabled={saving || !metodoForm.nome}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
