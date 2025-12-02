import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye,
  ArrowLeft,
  Loader2,
  Users,
  DollarSign,
  FileText
} from 'lucide-react';

interface Transacao {
  id: string;
  user_id: string;
  valor: number;
  tipo: string;
  status: string;
  banco: string | null;
  comprovativo_url: string | null;
  motivo_rejeicao: string | null;
  created_at: string;
  profiles?: {
    nome_completo: string | null;
  };
}

const Admin = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransacao, setSelectedTransacao] = useState<Transacao | null>(null);
  const [actionType, setActionType] = useState<'aprovar' | 'rejeitar' | null>(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [processing, setProcessing] = useState(false);
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [stats, setStats] = useState({
    pendentes: 0,
    aprovados: 0,
    rejeitados: 0,
    totalValor: 0
  });

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast.error('Acesso negado. Apenas administradores.');
      navigate('/');
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchTransacoes();
    }
  }, [isAdmin]);

  const fetchTransacoes = async () => {
    try {
      const { data, error } = await supabase
        .from('transacoes')
        .select(`
          *,
          profiles:user_id (nome_completo)
        `)
        .eq('tipo', 'deposito')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTransacoes(data || []);
      
      // Calculate stats
      const pendentes = data?.filter(t => t.status === 'pendente').length || 0;
      const aprovados = data?.filter(t => t.status === 'aprovado').length || 0;
      const rejeitados = data?.filter(t => t.status === 'rejeitado').length || 0;
      const totalValor = data?.filter(t => t.status === 'aprovado').reduce((acc, t) => acc + Number(t.valor), 0) || 0;
      
      setStats({ pendentes, aprovados, rejeitados, totalValor });
    } catch (error) {
      console.error('Erro ao buscar transações:', error);
      toast.error('Erro ao carregar depósitos');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!selectedTransacao || !actionType) return;

    setProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (actionType === 'aprovar') {
        // Update transaction status
        const { error: transacaoError } = await supabase
          .from('transacoes')
          .update({
            status: 'aprovado',
            data_validacao: new Date().toISOString(),
            validador_id: user?.id
          })
          .eq('id', selectedTransacao.id);

        if (transacaoError) throw transacaoError;

        // Add value to user balance
        const { error: profileError } = await supabase.rpc('increment_saldo', {
          user_id: selectedTransacao.user_id,
          amount: selectedTransacao.valor
        });

        if (profileError) throw profileError;

        toast.success('Depósito aprovado com sucesso!');
      } else {
        // Reject transaction
        const { error } = await supabase
          .from('transacoes')
          .update({
            status: 'rejeitado',
            motivo_rejeicao: motivoRejeicao,
            data_validacao: new Date().toISOString(),
            validador_id: user?.id
          })
          .eq('id', selectedTransacao.id);

        if (error) throw error;

        toast.success('Depósito rejeitado');
      }

      // Refresh data
      fetchTransacoes();
      setSelectedTransacao(null);
      setActionType(null);
      setMotivoRejeicao('');
    } catch (error) {
      console.error('Erro ao processar:', error);
      toast.error('Erro ao processar ação');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'aprovado':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" /> Aprovado</Badge>;
      case 'rejeitado':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="w-3 h-3 mr-1" /> Rejeitado</Badge>;
      default:
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-AO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate('/menu')}
          className="text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold text-white">Painel Administrativo</h1>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card className="bg-yellow-500/10 border-yellow-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="w-8 h-8 text-yellow-400" />
            <div>
              <p className="text-xs text-yellow-400/70">Pendentes</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.pendentes}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-400" />
            <div>
              <p className="text-xs text-green-400/70">Aprovados</p>
              <p className="text-2xl font-bold text-green-400">{stats.aprovados}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle className="w-8 h-8 text-red-400" />
            <div>
              <p className="text-xs text-red-400/70">Rejeitados</p>
              <p className="text-2xl font-bold text-red-400">{stats.rejeitados}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-primary" />
            <div>
              <p className="text-xs text-primary/70">Total Aprovado</p>
              <p className="text-lg font-bold text-primary">{stats.totalValor.toLocaleString()} Kz</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deposits List */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Depósitos para Validar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {transacoes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum depósito encontrado</p>
          ) : (
            transacoes.map((transacao) => (
              <Card key={transacao.id} className="bg-background/50 border-border/30">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-medium text-foreground flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {transacao.profiles?.nome_completo || 'Usuário'}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(transacao.created_at)}</p>
                    </div>
                    {getStatusBadge(transacao.status)}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div>
                      <span className="text-muted-foreground">Valor:</span>
                      <span className="ml-2 font-medium text-primary">{Number(transacao.valor).toLocaleString()} Kz</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Banco:</span>
                      <span className="ml-2">{transacao.banco || '-'}</span>
                    </div>
                  </div>

                  {transacao.motivo_rejeicao && (
                    <p className="text-xs text-red-400 mb-3">
                      Motivo: {transacao.motivo_rejeicao}
                    </p>
                  )}

                  <div className="flex gap-2">
                    {transacao.comprovativo_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewImage(transacao.comprovativo_url)}
                        className="flex-1"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ver Comprovativo
                      </Button>
                    )}
                    
                    {transacao.status === 'pendente' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedTransacao(transacao);
                            setActionType('aprovar');
                          }}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Aprovar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setSelectedTransacao(transacao);
                            setActionType('rejeitar');
                          }}
                          className="flex-1"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Rejeitar
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={!!actionType} onOpenChange={() => {
        setActionType(null);
        setSelectedTransacao(null);
        setMotivoRejeicao('');
      }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'aprovar' ? 'Confirmar Aprovação' : 'Rejeitar Depósito'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedTransacao && (
            <div className="py-4">
              <p className="text-sm text-muted-foreground mb-2">
                Valor: <span className="text-primary font-medium">{Number(selectedTransacao.valor).toLocaleString()} Kz</span>
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Usuário: {selectedTransacao.profiles?.nome_completo || 'Usuário'}
              </p>
              
              {actionType === 'aprovar' ? (
                <p className="text-sm">
                  Ao aprovar, o valor será adicionado ao saldo do usuário.
                </p>
              ) : (
                <Textarea
                  placeholder="Motivo da rejeição..."
                  value={motivoRejeicao}
                  onChange={(e) => setMotivoRejeicao(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setActionType(null);
              setSelectedTransacao(null);
              setMotivoRejeicao('');
            }}>
              Cancelar
            </Button>
            <Button
              onClick={handleAction}
              disabled={processing || (actionType === 'rejeitar' && !motivoRejeicao)}
              className={actionType === 'aprovar' ? 'bg-green-600 hover:bg-green-700' : ''}
              variant={actionType === 'rejeitar' ? 'destructive' : 'default'}
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Viewer Dialog */}
      <Dialog open={!!viewImage} onOpenChange={() => setViewImage(null)}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle>Comprovativo</DialogTitle>
          </DialogHeader>
          {viewImage && (
            <img 
              src={viewImage} 
              alt="Comprovativo" 
              className="w-full rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
