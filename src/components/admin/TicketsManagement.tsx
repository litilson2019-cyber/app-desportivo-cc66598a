import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  FileText, 
  Search, 
  Filter, 
  X, 
  Eye, 
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

interface Bilhete {
  id: string;
  user_id: string;
  modo: string | null;
  status: string | null;
  odds_totais: number | null;
  probabilidade_estimada: number | null;
  analise_ia: string | null;
  jogos: any;
  mercados_recomendados: any;
  created_at: string;
  profiles?: {
    nome_completo: string | null;
  };
}

export const TicketsManagement = () => {
  const [bilhetes, setBilhetes] = useState<Bilhete[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBilhete, setSelectedBilhete] = useState<Bilhete | null>(null);
  
  // Filters
  const [searchUser, setSearchUser] = useState('');
  const [filterModo, setFilterModo] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterDataInicio, setFilterDataInicio] = useState<string>('');
  const [filterDataFim, setFilterDataFim] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const [stats, setStats] = useState({
    total: 0,
    pendentes: 0,
    arriscado: 0,
    seguro: 0
  });

  useEffect(() => {
    fetchBilhetes();
  }, []);

  const fetchBilhetes = async () => {
    try {
      const { data, error } = await supabase
        .from('bilhetes')
        .select(`
          *,
          profiles:user_id (nome_completo)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setBilhetes(data || []);
      
      const total = data?.length || 0;
      const pendentes = data?.filter(b => b.status === 'pendente').length || 0;
      const arriscado = data?.filter(b => b.modo === 'arriscado').length || 0;
      const seguro = data?.filter(b => b.modo === 'seguro').length || 0;
      
      setStats({ total, pendentes, arriscado, seguro });
    } catch (error) {
      console.error('Error fetching bilhetes:', error);
      toast.error('Erro ao carregar bilhetes');
    } finally {
      setLoading(false);
    }
  };

  const filteredBilhetes = useMemo(() => {
    return bilhetes.filter(b => {
      if (filterModo !== 'todos' && b.modo !== filterModo) return false;
      if (filterStatus !== 'todos' && b.status !== filterStatus) return false;
      if (searchUser && !b.profiles?.nome_completo?.toLowerCase().includes(searchUser.toLowerCase())) return false;
      
      if (filterDataInicio) {
        const bilheteDate = new Date(b.created_at);
        const startDate = new Date(filterDataInicio);
        startDate.setHours(0, 0, 0, 0);
        if (bilheteDate < startDate) return false;
      }
      
      if (filterDataFim) {
        const bilheteDate = new Date(b.created_at);
        const endDate = new Date(filterDataFim);
        endDate.setHours(23, 59, 59, 999);
        if (bilheteDate > endDate) return false;
      }
      
      return true;
    });
  }, [bilhetes, filterModo, filterStatus, filterDataInicio, filterDataFim, searchUser]);

  const hasActiveFilters = filterModo !== 'todos' || filterStatus !== 'todos' || filterDataInicio || filterDataFim || searchUser;

  const clearFilters = () => {
    setFilterModo('todos');
    setFilterStatus('todos');
    setFilterDataInicio('');
    setFilterDataFim('');
    setSearchUser('');
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'concluido':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" /> Concluído</Badge>;
      case 'em_analise':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30"><Clock className="w-3 h-3 mr-1" /> Em Análise</Badge>;
      case 'cancelado':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="w-3 h-3 mr-1" /> Cancelado</Badge>;
      default:
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><AlertCircle className="w-3 h-3 mr-1" /> Pendente</Badge>;
    }
  };

  const getModoBadge = (modo: string | null) => {
    if (modo === 'arriscado') {
      return <Badge variant="outline" className="border-blue-500/50 text-blue-400">Arriscado</Badge>;
    }
    return <Badge variant="outline" className="border-green-500/50 text-green-400">Seguro</Badge>;
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
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="p-4 flex items-center gap-3">
            <FileText className="w-8 h-8 text-primary" />
            <div>
              <p className="text-xs text-primary/70">Total Bilhetes</p>
              <p className="text-2xl font-bold text-primary">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-500/10 border-yellow-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="w-8 h-8 text-yellow-400" />
            <div>
              <p className="text-xs text-yellow-400/70">Pendentes</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.pendentes}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-blue-400" />
            <div>
              <p className="text-xs text-blue-400/70">Modo Arriscado</p>
              <p className="text-2xl font-bold text-blue-400">{stats.arriscado}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-400" />
            <div>
              <p className="text-xs text-green-400/70">Modo Seguro</p>
              <p className="text-2xl font-bold text-green-400">{stats.seguro}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
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
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground text-xs">
                <X className="w-3 h-3 mr-1" /> Limpar
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
                <label className="text-xs text-muted-foreground mb-1 block">Modo</label>
                <Select value={filterModo} onValueChange={setFilterModo}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="arriscado">Arriscado</SelectItem>
                    <SelectItem value="seguro">Seguro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="em_analise">Em Análise</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
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

      {/* Bilhetes List */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Bilhetes
            </span>
            <span className="text-sm font-normal text-muted-foreground">
              {filteredBilhetes.length} de {bilhetes.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {filteredBilhetes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {hasActiveFilters ? 'Nenhum bilhete encontrado com os filtros aplicados' : 'Nenhum bilhete encontrado'}
            </p>
          ) : (
            filteredBilhetes.map((bilhete) => (
              <Card key={bilhete.id} className="bg-background/50 border-border/30">
                <CardContent className="p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-foreground text-sm">
                        {bilhete.profiles?.nome_completo || 'Usuário'}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(bilhete.created_at)}</p>
                    </div>
                    <div className="flex gap-1">
                      {getModoBadge(bilhete.modo)}
                      {getStatusBadge(bilhete.status)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                    <div className="bg-background/50 rounded p-2">
                      <span className="text-muted-foreground">Odds:</span>
                      <span className="ml-1 font-medium">{bilhete.odds_totais?.toFixed(2) || '-'}</span>
                    </div>
                    <div className="bg-background/50 rounded p-2">
                      <span className="text-muted-foreground">Prob:</span>
                      <span className="ml-1 font-medium">{bilhete.probabilidade_estimada ? `${(bilhete.probabilidade_estimada * 100).toFixed(0)}%` : '-'}</span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedBilhete(bilhete)}
                    className="w-full"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Ver Detalhes
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      {/* Details Modal */}
      <Dialog open={!!selectedBilhete} onOpenChange={() => setSelectedBilhete(null)}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Bilhete</DialogTitle>
          </DialogHeader>
          
          {selectedBilhete && (
            <div className="space-y-4">
              <div className="flex gap-2">
                {getModoBadge(selectedBilhete.modo)}
                {getStatusBadge(selectedBilhete.status)}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Usuário</p>
                  <p className="font-medium">{selectedBilhete.profiles?.nome_completo || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Data</p>
                  <p className="font-medium">{formatDate(selectedBilhete.created_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Odds Totais</p>
                  <p className="font-medium">{selectedBilhete.odds_totais?.toFixed(2) || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Probabilidade</p>
                  <p className="font-medium">{selectedBilhete.probabilidade_estimada ? `${(selectedBilhete.probabilidade_estimada * 100).toFixed(0)}%` : '-'}</p>
                </div>
              </div>

              {selectedBilhete.jogos && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Jogos</p>
                  <div className="bg-background/50 rounded p-3 text-sm">
                    <pre className="whitespace-pre-wrap text-xs">
                      {JSON.stringify(selectedBilhete.jogos, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {selectedBilhete.analise_ia && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Análise IA</p>
                  <div className="bg-background/50 rounded p-3 text-sm">
                    {selectedBilhete.analise_ia}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
