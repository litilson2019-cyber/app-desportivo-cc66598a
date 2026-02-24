import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatKz } from '@/lib/formatKz';
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
  Eye,
  Loader2,
  Users,
  DollarSign,
  FileText,
  Filter,
  X,
  Search,
  Download
} from 'lucide-react';
import { ExportButton } from './ExportButton';

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

export const DepositsManagement = () => {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransacao, setSelectedTransacao] = useState<Transacao | null>(null);
  const [actionType, setActionType] = useState<'aprovar' | 'rejeitar' | null>(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [processing, setProcessing] = useState(false);
  const [viewImage, setViewImage] = useState<string | null>(null);
  
  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterBanco, setFilterBanco] = useState<string>('todos');
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

  const bancos = useMemo(() => {
    const uniqueBanks = [...new Set(transacoes.map(t => t.banco).filter(Boolean))];
    return uniqueBanks as string[];
  }, [transacoes]);

  const filteredTransacoes = useMemo(() => {
    return transacoes.filter(t => {
      if (filterStatus !== 'todos' && t.status !== filterStatus) return false;
      if (filterBanco !== 'todos' && t.banco !== filterBanco) return false;
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
  }, [transacoes, filterStatus, filterBanco, filterDataInicio, filterDataFim, searchUser]);

  const hasActiveFilters = filterStatus !== 'todos' || filterBanco !== 'todos' || filterDataInicio || filterDataFim || searchUser;

  const clearFilters = () => {
    setFilterStatus('todos');
    setFilterBanco('todos');
    setFilterDataInicio('');
    setFilterDataFim('');
    setSearchUser('');
  };

  useEffect(() => {
    fetchTransacoes();

    // Setup realtime subscription para atualizações em tempo real
    const channel = supabase
      .channel('transacoes-admin')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transacoes',
          filter: 'tipo=eq.deposito'
        },
        (payload) => {
          console.log('Realtime update:', payload);
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
        .select(`
          *,
          profiles:user_id (nome_completo)
        `)
        .eq('tipo', 'deposito')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTransacoes(data || []);
      
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

  // Função para registrar log de ação administrativa
  const logAdminAction = async (acao: string, detalhes: Record<string, string | number | null | undefined>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('admin_logs').insert as any)([{
        admin_id: user.id,
        acao,
        detalhes
      }]);
    } catch (error) {
      console.error('Erro ao registrar log:', error);
    }
  };

  // Função para buscar configurações de bónus
  const fetchBonusConfigs = async () => {
    const { data } = await supabase
      .from('configuracoes_sistema')
      .select('chave, valor')
      .in('chave', [
        'bonus_deposito_ativo',
        'bonus_deposito_tipo',
        'bonus_deposito_valor',
        'bonus_indicacao_ativo',
        'bonus_indicacao_tipo',
        'bonus_indicacao_valor'
      ]);
    
    const configs: Record<string, string> = {};
    data?.forEach(c => {
      configs[c.chave] = c.valor || '';
    });
    return configs;
  };

  // Função para calcular bónus
  const calcularBonus = (valor: number, tipo: string, bonusValor: string): number => {
    const valorBonus = parseFloat(bonusValor) || 0;
    if (tipo === 'percentagem') {
      return (valor * valorBonus) / 100;
    }
    return valorBonus;
  };

  const handleAction = async () => {
    if (!selectedTransacao || !actionType) return;

    setProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (actionType === 'aprovar') {
        // Verificar se já foi aprovado (prevenir duplicação)
        const { data: transacaoAtual } = await supabase
          .from('transacoes')
          .select('status')
          .eq('id', selectedTransacao.id)
          .single();
        
        if (transacaoAtual?.status === 'aprovado') {
          toast.error('Este depósito já foi aprovado anteriormente');
          setProcessing(false);
          return;
        }

        // Buscar configurações de bónus
        const bonusConfigs = await fetchBonusConfigs();
        
        // Atualizar transação para aprovado
        const { error: transacaoError } = await supabase
          .from('transacoes')
          .update({
            status: 'aprovado',
            data_validacao: new Date().toISOString(),
            validador_id: user?.id
          })
          .eq('id', selectedTransacao.id);

        if (transacaoError) throw transacaoError;

        // 1. Transferir 100% do valor depositado
        const valorDeposito = selectedTransacao.valor;
        await supabase.rpc('increment_saldo', {
          user_id: selectedTransacao.user_id,
          amount: valorDeposito
        });

        let bonusDepositoValor = 0;
        let bonusIndicacaoValor = 0;
        let indicadorId: string | null = null;

        // 2. Calcular e transferir bónus de depósito (se ativo)
        if (bonusConfigs['bonus_deposito_ativo'] === 'true') {
          bonusDepositoValor = calcularBonus(
            valorDeposito,
            bonusConfigs['bonus_deposito_tipo'],
            bonusConfigs['bonus_deposito_valor']
          );
          
          if (bonusDepositoValor > 0) {
            await supabase.rpc('increment_saldo', {
              user_id: selectedTransacao.user_id,
              amount: bonusDepositoValor
            });
          }
        }

        // 3. Verificar indicação e transferir bónus ao indicador (se ativo)
        if (bonusConfigs['bonus_indicacao_ativo'] === 'true') {
          const { data: indicacao } = await supabase
            .from('invited_users')
            .select('referrer_id')
            .eq('invited_user_id', selectedTransacao.user_id)
            .maybeSingle();
          
          if (indicacao?.referrer_id) {
            indicadorId = indicacao.referrer_id;
            bonusIndicacaoValor = calcularBonus(
              valorDeposito,
              bonusConfigs['bonus_indicacao_tipo'],
              bonusConfigs['bonus_indicacao_valor']
            );
            
            if (bonusIndicacaoValor > 0) {
              await supabase.rpc('increment_saldo', {
                user_id: indicadorId,
                amount: bonusIndicacaoValor
              });
            }
          }
        }

        // Calcular total creditado
        const totalCreditado = valorDeposito + bonusDepositoValor;

        // Registrar log completo de aprovação
        await logAdminAction('aprovar_deposito', {
          transacao_id: selectedTransacao.id,
          user_id: selectedTransacao.user_id,
          user_nome: selectedTransacao.profiles?.nome_completo,
          valor_depositado: valorDeposito,
          bonus_deposito: bonusDepositoValor,
          total_creditado: totalCreditado,
          bonus_indicacao: bonusIndicacaoValor,
          indicador_id: indicadorId,
          banco: selectedTransacao.banco,
          status_final: 'aprovado'
        });

        // Mensagem de sucesso detalhada
        let mensagem = `Depósito aprovado! ${formatKz(valorDeposito)} creditado`;
        if (bonusDepositoValor > 0) {
          mensagem += ` + ${formatKz(bonusDepositoValor)} de bónus`;
        }
        if (bonusIndicacaoValor > 0) {
          mensagem += `. Indicador recebeu ${formatKz(bonusIndicacaoValor)}`;
        }
        toast.success(mensagem);
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

        // Registrar log de rejeição
        await logAdminAction('rejeitar_deposito', {
          transacao_id: selectedTransacao.id,
          user_id: selectedTransacao.user_id,
          user_nome: selectedTransacao.profiles?.nome_completo,
          valor: selectedTransacao.valor,
          banco: selectedTransacao.banco,
          motivo: motivoRejeicao,
          status_final: 'rejeitado'
        });

        toast.success('Depósito rejeitado');
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

  const handleDownloadComprovativo = (url: string) => {
    window.open(url, '_blank');
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
              <p className="text-xs text-primary/70">Total Aprovado</p>
              <p className="text-lg font-bold text-primary">{formatKz(stats.totalValor)}</p>
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
                <Badge variant="secondary" className="ml-1 text-xs">
                  Ativo
                </Badge>
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
            
            <div className="grid grid-cols-2 gap-3">
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
                <label className="text-xs text-muted-foreground mb-1 block">Banco</label>
                <Select value={filterBanco} onValueChange={setFilterBanco}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {bancos.map(banco => (
                      <SelectItem key={banco} value={banco}>{banco}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
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

      {/* Deposits List */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Depósitos
            </span>
            <div className="flex items-center gap-2">
              <ExportButton 
                data={filteredTransacoes as unknown as Record<string, unknown>[]}
                filename="depositos"
                columns={[
                  { key: 'profiles.nome_completo', label: 'Usuário' },
                  { key: 'valor', label: 'Valor' },
                  { key: 'banco', label: 'Banco' },
                  { key: 'status', label: 'Status' },
                  { key: 'created_at', label: 'Data' }
                ]}
              />
              <span className="text-sm font-normal text-muted-foreground">
                {filteredTransacoes.length} de {transacoes.length}
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredTransacoes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {hasActiveFilters ? 'Nenhum depósito encontrado com os filtros aplicados' : 'Nenhum depósito encontrado'}
            </p>
          ) : (
            filteredTransacoes.map((transacao) => (
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
                      <span className="ml-2 font-medium text-primary">{formatKz(Number(transacao.valor))}</span>
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

                  <div className="flex flex-wrap gap-2">
                    {transacao.comprovativo_url && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewImage(transacao.comprovativo_url)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Ver
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadComprovativo(transacao.comprovativo_url!)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Baixar
                        </Button>
                      </>
                    )}
                    
                    {transacao.status === 'pendente' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedTransacao(transacao);
                            setActionType('aprovar');
                          }}
                          className="bg-green-600 hover:bg-green-700"
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
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Rejeitar
                        </Button>
                      </>
                    )}
                    
                    {!transacao.comprovativo_url && transacao.status !== 'pendente' && (
                      <span className="text-xs text-muted-foreground italic">Sem comprovativo</span>
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
                Valor: <span className="text-primary font-medium">{formatKz(Number(selectedTransacao.valor))}</span>
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
