import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  Users, 
  FileText, 
  TrendingUp, 
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Wallet,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

interface DashboardStats {
  totalUsuarios: number;
  usuariosAtivos: number;
  totalDepositos: number;
  depositosAprovados: number;
  depositosPendentes: number;
  depositosRejeitados: number;
  totalBilhetes: number;
  bilhetesHoje: number;
  bilhetesRisco: number;
  bilhetesSeguro: number;
  saldoTotal: number;
  depositosHoje: number;
  taxaCrescimento: number;
}

interface ChartData {
  data: string;
  depositos: number;
  bilhetes: number;
}

interface PeriodComparison {
  atual: number;
  anterior: number;
  percentChange: number;
}

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(142, 76%, 36%)', 'hsl(0, 84%, 60%)', 'hsl(45, 93%, 47%)'];

export const FinancialDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsuarios: 0,
    usuariosAtivos: 0,
    totalDepositos: 0,
    depositosAprovados: 0,
    depositosPendentes: 0,
    depositosRejeitados: 0,
    totalBilhetes: 0,
    bilhetesHoje: 0,
    bilhetesRisco: 0,
    bilhetesSeguro: 0,
    saldoTotal: 0,
    depositosHoje: 0,
    taxaCrescimento: 0
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<'7d' | '30d' | '90d'>('7d');
  const [comparison, setComparison] = useState<{
    depositos: PeriodComparison;
    usuarios: PeriodComparison;
    bilhetes: PeriodComparison;
  }>({
    depositos: { atual: 0, anterior: 0, percentChange: 0 },
    usuarios: { atual: 0, anterior: 0, percentChange: 0 },
    bilhetes: { atual: 0, anterior: 0, percentChange: 0 }
  });
  const [bilhetesDistribuicao, setBilhetesDistribuicao] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, [periodFilter]);

  const getDaysFromFilter = () => {
    switch (periodFilter) {
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      default: return 7;
    }
  };

  const fetchDashboardData = async () => {
    try {
      const days = getDaysFromFilter();
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const periodoAtualInicio = new Date();
      periodoAtualInicio.setDate(periodoAtualInicio.getDate() - days);
      
      const periodoAnteriorInicio = new Date();
      periodoAnteriorInicio.setDate(periodoAnteriorInicio.getDate() - (days * 2));

      // Fetch users stats
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, saldo, bloqueado, created_at');

      const totalUsuarios = profiles?.length || 0;
      const usuariosAtivos = profiles?.filter(p => !p.bloqueado).length || 0;
      const saldoTotal = profiles?.reduce((acc, p) => acc + (p.saldo || 0), 0) || 0;
      
      const usuariosNovosAtual = profiles?.filter(p => new Date(p.created_at) >= periodoAtualInicio).length || 0;
      const usuariosNovosAnterior = profiles?.filter(p => {
        const date = new Date(p.created_at);
        return date >= periodoAnteriorInicio && date < periodoAtualInicio;
      }).length || 0;

      // Fetch all transactions (only deposits)
      const { data: transacoes } = await supabase
        .from('transacoes')
        .select('id, valor, status, tipo, created_at')
        .eq('tipo', 'deposito');

      // Deposits
      const depositos = transacoes || [];
      const totalDepositos = depositos.length;
      const depositosAprovados = depositos.filter(t => t.status === 'aprovado').reduce((acc, t) => acc + Number(t.valor), 0);
      const depositosPendentes = depositos.filter(t => t.status === 'pendente').length;
      const depositosRejeitados = depositos.filter(t => t.status === 'rejeitado').length;
      const depositosHoje = depositos.filter(t => 
        new Date(t.created_at) >= hoje && t.status === 'aprovado'
      ).reduce((acc, t) => acc + Number(t.valor), 0);

      const depositosAtual = depositos
        .filter(t => new Date(t.created_at) >= periodoAtualInicio && t.status === 'aprovado')
        .reduce((acc, t) => acc + Number(t.valor), 0);
      const depositosAnterior = depositos
        .filter(t => {
          const date = new Date(t.created_at);
          return date >= periodoAnteriorInicio && date < periodoAtualInicio && t.status === 'aprovado';
        })
        .reduce((acc, t) => acc + Number(t.valor), 0);

      // Fetch tickets stats
      const { data: bilhetes } = await supabase
        .from('bilhetes')
        .select('id, created_at, modo');

      const totalBilhetes = bilhetes?.length || 0;
      const bilhetesHoje = bilhetes?.filter(b => new Date(b.created_at) >= hoje).length || 0;
      const bilhetesRisco = bilhetes?.filter(b => b.modo !== 'seguro').length || 0;
      const bilhetesSeguro = bilhetes?.filter(b => b.modo === 'seguro').length || 0;

      const bilhetesAtual = bilhetes?.filter(b => new Date(b.created_at) >= periodoAtualInicio).length || 0;
      const bilhetesAnterior = bilhetes?.filter(b => {
        const date = new Date(b.created_at);
        return date >= periodoAnteriorInicio && date < periodoAtualInicio;
      }).length || 0;

      // Set stats
      const taxaCrescimento = depositosAnterior > 0 
        ? ((depositosAtual - depositosAnterior) / depositosAnterior) * 100 
        : 0;

      setStats({
        totalUsuarios,
        usuariosAtivos,
        totalDepositos,
        depositosAprovados,
        depositosPendentes,
        depositosRejeitados,
        totalBilhetes,
        bilhetesHoje,
        bilhetesRisco,
        bilhetesSeguro,
        saldoTotal,
        depositosHoje,
        taxaCrescimento
      });

      // Set comparison
      setComparison({
        depositos: {
          atual: depositosAtual,
          anterior: depositosAnterior,
          percentChange: depositosAnterior > 0 ? ((depositosAtual - depositosAnterior) / depositosAnterior) * 100 : 0
        },
        usuarios: {
          atual: usuariosNovosAtual,
          anterior: usuariosNovosAnterior,
          percentChange: usuariosNovosAnterior > 0 ? ((usuariosNovosAtual - usuariosNovosAnterior) / usuariosNovosAnterior) * 100 : 0
        },
        bilhetes: {
          atual: bilhetesAtual,
          anterior: bilhetesAnterior,
          percentChange: bilhetesAnterior > 0 ? ((bilhetesAtual - bilhetesAnterior) / bilhetesAnterior) * 100 : 0
        }
      });

      // Set bilhetes distribution
      setBilhetesDistribuicao([
        { name: 'Risco', value: bilhetesRisco },
        { name: 'Seguro', value: bilhetesSeguro }
      ]);

      // Prepare chart data
      const chartDays: ChartData[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayDeposits = depositos?.filter(t => {
          const tDate = new Date(t.created_at).toISOString().split('T')[0];
          return tDate === dateStr && t.status === 'aprovado';
        }).reduce((acc, t) => acc + Number(t.valor), 0) || 0;

        const dayTickets = bilhetes?.filter(b => {
          const bDate = new Date(b.created_at).toISOString().split('T')[0];
          return bDate === dateStr;
        }).length || 0;

        chartDays.push({
          data: date.toLocaleDateString('pt-AO', { day: '2-digit', month: '2-digit' }),
          depositos: dayDeposits / 1000,
          bilhetes: dayTickets
        });
      }
      setChartData(chartDays);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
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
      {/* Header with filters */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as const).map((period) => (
            <Button
              key={period}
              variant={periodFilter === period ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriodFilter(period)}
              className="text-xs"
            >
              {period === '7d' ? '7 dias' : period === '30d' ? '30 dias' : '90 dias'}
            </Button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Alerts for pending items */}
      {stats.depositosPendentes > 0 && (
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="p-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <div className="flex-1 text-sm">
              <span className="text-amber-300 font-medium">Atenção: </span>
              <span className="text-amber-200/80">
                {stats.depositosPendentes} depósito(s) pendente(s)
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-300/70">Usuários Ativos</p>
                <p className="text-2xl font-bold text-blue-300">{stats.usuariosAtivos}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {comparison.usuarios.percentChange >= 0 ? (
                    <ArrowUpRight className="w-3 h-3 text-green-400" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 text-red-400" />
                  )}
                  <span className={comparison.usuarios.percentChange >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {formatPercent(comparison.usuarios.percentChange)}
                  </span>
                  <span>vs anterior</span>
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-400/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-300/70">Depósitos Aprovados</p>
                <p className="text-2xl font-bold text-green-300">{(stats.depositosAprovados / 1000).toFixed(0)}k</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {comparison.depositos.percentChange >= 0 ? (
                    <ArrowUpRight className="w-3 h-3 text-green-400" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 text-red-400" />
                  )}
                  <span className={comparison.depositos.percentChange >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {formatPercent(comparison.depositos.percentChange)}
                  </span>
                  <span>vs anterior</span>
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-400/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-300/70">Total Bilhetes</p>
                <p className="text-2xl font-bold text-purple-300">{stats.totalBilhetes}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {comparison.bilhetes.percentChange >= 0 ? (
                    <ArrowUpRight className="w-3 h-3 text-green-400" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 text-red-400" />
                  )}
                  <span className={comparison.bilhetes.percentChange >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {formatPercent(comparison.bilhetes.percentChange)}
                  </span>
                  <span>vs anterior</span>
                </p>
              </div>
              <FileText className="w-8 h-8 text-purple-400/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-300/70">Saldo Total Interno</p>
                <p className="text-2xl font-bold text-amber-300">{(stats.saldoTotal / 1000).toFixed(0)}k</p>
                <p className="text-xs text-muted-foreground">Kz (uso interno)</p>
              </div>
              <Wallet className="w-8 h-8 text-amber-400/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Status Overview */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="bg-yellow-500/10 border-yellow-500/20">
          <CardContent className="p-3 text-center">
            <Clock className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-yellow-400">{stats.depositosPendentes}</p>
            <p className="text-[10px] text-yellow-400/70">Dep. Pendentes</p>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="p-3 text-center">
            <CheckCircle className="w-5 h-5 text-green-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-green-400">{stats.totalDepositos - stats.depositosPendentes - stats.depositosRejeitados}</p>
            <p className="text-[10px] text-green-400/70">Dep. Aprovados</p>
          </CardContent>
        </Card>
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="p-3 text-center">
            <XCircle className="w-5 h-5 text-red-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-red-400">{stats.depositosRejeitados}</p>
            <p className="text-[10px] text-red-400/70">Dep. Rejeitados</p>
          </CardContent>
        </Card>
      </div>

      {/* Bilhetes Distribution */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Distribuição de Bilhetes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="w-24 h-24">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={bilhetesDistribuicao}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={40}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {bilhetesDistribuicao.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span className="text-sm">Risco</span>
                </div>
                <Badge variant="secondary">{stats.bilhetesRisco}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[1] }} />
                  <span className="text-sm">Seguro</span>
                </div>
                <Badge variant="secondary">{stats.bilhetesSeguro}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deposits Chart */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Depósitos Aprovados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="data" 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(v) => `${v}k`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [`${value.toFixed(1)}k Kz`, 'Depósitos']}
                />
                <Bar dataKey="depositos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="depositos" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Chart */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Bilhetes Criados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="data" 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [value, 'Bilhetes']}
                />
                <Line 
                  type="monotone" 
                  dataKey="bilhetes" 
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Bilhetes Hoje</p>
            <p className="text-xl font-bold text-purple-400">{stats.bilhetesHoje}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Hoje em Depósitos</p>
            <p className="text-xl font-bold text-green-400">{(stats.depositosHoje / 1000).toFixed(1)}k Kz</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
