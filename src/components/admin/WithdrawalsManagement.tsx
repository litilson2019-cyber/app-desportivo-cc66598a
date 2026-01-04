import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2,
  DollarSign,
  Filter,
  X,
  Search,
  ArrowDownCircle,
  CreditCard
} from 'lucide-react';

interface Transacao {
  id: string;
  user_id: string;
  valor: number;
  tipo: string;
  status: string;
  banco: string | null;
  descricao: string | null;
  motivo_rejeicao: string | null;
  created_at: string;
  profiles?: {
    nome_completo: string | null;
    saldo: number | null;
  };
}

export const WithdrawalsManagement = () => {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransacao, setSelectedTransacao] = useState<Transacao | null>(null);
  const [actionType, setActionType] = useState<'aprovar' | 'rejeitar' | null>(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [processing, setProcessing] = useState(false);
  
  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterDataInicio, setFilterDataInicio] = useState<string>('');
  const [filterDataFim, setFilterDataFim] = useState<string>('');
  const [searchUser, setSearchUser] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [stats, setStats] = useState({
    pendentes: 0,
    aprovados: 0,
    rejeitados: 0,
    totalValor: 0
  });

  const filteredTransacoes = useMemo(() => {
    return transacoes.filter(t => {
      if (filterStatus !== 'todos' && t.status !== filterStatus) return false;
      if (searchUser && !t.profiles?.nome_completo?.toLowerCase().includes(searchUser.toLowerCase())) return false;
      
      if (filterDataInicio) {
        const transacaoDate = new Date(t.created_at);
        const startDate = new Date(filterDataInicio);
        startDate.setHours(0, 0, 0, 0);
        if (transacaoDate < startDate) return false;
      }
      
      if (filterDataFim) {
        const transacaoDate = new Date(t.created_at);
        const endDate = new Date(filterDataFim);
        endDate.setHours(23, 59, 59, 999);
        if (transacaoDate > endDate) return false;
      }
      
      return true;
    });
  }, [transacoes, filterStatus, filterDataInicio, filterDataFim, searchUser]);

  const hasActiveFilters = filterStatus !== 'todos' || filterDataInicio || filterDataFim || searchUser;

  const clearFilters = () => {
    setFilterStatus('todos');
    setFilterDataInicio('');
    setFilterDataFim('');
    setSearchUser('');
  };

  useEffect(() => {
    fetchTransacoes();

    const channel = supabase
      .channel('levantamentos-admin')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transacoes',
          filter: 'tipo=eq.levantamento'
        },
        () => {
          fetchTransacoes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTransacoes = async () => {
    try {
      const { data, error } = await supabase
        .from('transacoes')
        .select('*')
        .eq('tipo', 'levantamento')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get profile info
      const userIds = data?.map(t => t.user_id) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, nome_completo, saldo')
        .in('id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      const transacoesWithProfiles = data?.map(t => ({
        ...t,
        profiles: profilesMap.get(t.user_id) || { nome_completo: null, saldo: null }
      })) || [];

      setTransacoes(transacoesWithProfiles);
      
      const pendentes = data?.filter(t => t.status === 'pendente').length || 0;
      const aprovados = data?.filter(t => t.status === 'aprovado').length || 0;
      const rejeitados = data?.filter(t => t.status === 'rejeitado').length || 0;
      const totalValor = data?.filter(t => t.status === 'aprovado').reduce((acc, t) => acc + Number(t.valor), 0) || 0;
      
      setStats({ pendentes, aprovados, rejeitados, totalValor });
    } catch (error) {
      console.error('Erro ao buscar transações:', error);
      toast.error('Erro ao carregar levantamentos');
    } finally {
      setLoading(false);
    }
  };

  const logAdminAction = async (acao: string, detalhes: Record<string, string | number | null | undefined>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('admin_logs').insert({
        admin_id: user.id,
        acao,
        detalhes
      });
    } catch (error) {
      console.error('Erro ao registrar log:', error);
    }
  };

  const handleAction = async () => {
    if (!selectedTransacao || !actionType) return;

    setProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (actionType === 'aprovar') {
        // Verificar se usuário tem saldo suficiente
        if ((selectedTransacao.profiles?.saldo || 0) < selectedTransacao.valor) {
          toast.error('Usuário não tem saldo suficiente');
          setProcessing(false);
          return;
        }

        // Deduzir saldo do usuário
        const { error: saldoError } = await supabase.rpc('increment_saldo', {
          user_id: selectedTransacao.user_id,
          amount: -selectedTransacao.valor
        });

        if (saldoError) throw saldoError;

        const { error: transacaoError } = await supabase
          .from('transacoes')
          .update({
            status: 'aprovado',
            data_validacao: new Date().toISOString(),
            validador_id: user?.id
          })
          .eq('id', selectedTransacao.id);

        if (transacaoError) throw transacaoError;

        await logAdminAction('aprovar_levantamento', {
          transacao_id: selectedTransacao.id,
          user_id: selectedTransacao.user_id,
          user_nome: selectedTransacao.profiles?.nome_completo,
          valor: selectedTransacao.valor,
          status_final: 'aprovado'
        });

        toast.success('Levantamento aprovado com sucesso!');
      } else {
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

        await logAdminAction('rejeitar_levantamento', {
          transacao_id: selectedTransacao.id,
          user_id: selectedTransacao.user_id,
          user_nome: selectedTransacao.profiles?.nome_completo,
          valor: selectedTransacao.valor,
          motivo: motivoRejeicao,
          status_final: 'rejeitado'
        });

        toast.success('Levantamento rejeitado');
      }

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
      case 'concluido':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" /> Aprovado</Badge>;
      case 'rejeitado':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="w-3 h-3 mr-1" /> Rejeitado</Badge>;
      case 'pendente':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30"><Clock className="w-3 h-3 mr-1" /> {status}</Badge>;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
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
              <p className="text-xs text-primary/70">Total Pago</p>
              <p className="text-lg font-bold text-primary">{stats.totalValor.toLocaleString()} Kz</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Section */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filtros
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1 text-xs">Ativo</Badge>
              )}
            </Button>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground text-xs"
              >
                <X className="w-3 h-3 mr-1" />
                Limpar
              </Button>
            )}
          </div>
        </CardHeader>
        
        {showFilters && (
          <CardContent className="pt-2 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por usuário..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="aprovado">Aprovado</SelectItem>
                    <SelectItem value="rejeitado">Rejeitado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Data Início</label>
                <Input
                  type="date"
                  value={filterDataInicio}
                  onChange={(e) => setFilterDataInicio(e.target.value)}
                  className="h-9"
                />
              </div>
              
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Data Fim</label>
                <Input
                  type="date"
                  value={filterDataFim}
                  onChange={(e) => setFilterDataFim(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Withdrawals List */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ArrowDownCircle className="w-5 h-5" />
              Levantamentos
            </span>
            <span className="text-sm font-normal text-muted-foreground">
              {filteredTransacoes.length} de {transacoes.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredTransacoes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {hasActiveFilters ? 'Nenhum levantamento encontrado com os filtros aplicados' : 'Nenhum levantamento encontrado'}
            </p>
          ) : (
            filteredTransacoes.map((transacao) => (
              <Card key={transacao.id} className="bg-background/50 border-border/30">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-medium text-foreground flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        {transacao.profiles?.nome_completo || 'Usuário'}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(transacao.created_at)}</p>
                    </div>
                    {getStatusBadge(transacao.status)}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div>
                      <span className="text-muted-foreground">Valor:</span>
                      <span className="ml-2 font-medium text-red-400">{Number(transacao.valor).toLocaleString()} Kz</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Saldo Atual:</span>
                      <span className="ml-2 font-medium text-primary">
                        {(transacao.profiles?.saldo || 0).toLocaleString()} Kz
                      </span>
                    </div>
                  </div>

                  {transacao.descricao && (
                    <p className="text-xs text-muted-foreground mb-3">
                      Dados: {transacao.descricao}
                    </p>
                  )}

                  {transacao.motivo_rejeicao && (
                    <p className="text-xs text-red-400 mb-3">
                      Motivo: {transacao.motivo_rejeicao}
                    </p>
                  )}

                  {transacao.status === 'pendente' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => {
                          setSelectedTransacao(transacao);
                          setActionType('aprovar');
                        }}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        onClick={() => {
                          setSelectedTransacao(transacao);
                          setActionType('rejeitar');
                        }}
                      >
                        <XCircle className="w-3 h-3 mr-1" />
                        Rejeitar
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      {/* Action Modal */}
      <Dialog 
        open={!!selectedTransacao && !!actionType} 
        onOpenChange={() => {
          setSelectedTransacao(null);
          setActionType(null);
          setMotivoRejeicao('');
        }}
      >
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'aprovar' ? 'Aprovar Levantamento' : 'Rejeitar Levantamento'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-background/50 rounded p-3 space-y-2">
              <p className="text-sm">
                <span className="text-muted-foreground">Usuário:</span>{' '}
                <span className="font-medium">{selectedTransacao?.profiles?.nome_completo}</span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Valor:</span>{' '}
                <span className="font-medium text-red-400">{selectedTransacao?.valor.toLocaleString()} Kz</span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Saldo disponível:</span>{' '}
                <span className="font-medium text-primary">
                  {(selectedTransacao?.profiles?.saldo || 0).toLocaleString()} Kz
                </span>
              </p>
            </div>

            {actionType === 'aprovar' && (
              <p className="text-sm text-yellow-400">
                ⚠️ O valor será debitado do saldo do usuário.
              </p>
            )}

            {actionType === 'rejeitar' && (
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  Motivo da Rejeição *
                </label>
                <Textarea
                  value={motivoRejeicao}
                  onChange={(e) => setMotivoRejeicao(e.target.value)}
                  placeholder="Informe o motivo..."
                  rows={3}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedTransacao(null);
                setActionType(null);
                setMotivoRejeicao('');
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAction}
              disabled={processing || (actionType === 'rejeitar' && !motivoRejeicao.trim())}
              className={actionType === 'aprovar' ? 'bg-green-600 hover:bg-green-700' : ''}
              variant={actionType === 'rejeitar' ? 'destructive' : 'default'}
            >
              {processing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : actionType === 'aprovar' ? (
                'Confirmar Aprovação'
              ) : (
                'Confirmar Rejeição'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
