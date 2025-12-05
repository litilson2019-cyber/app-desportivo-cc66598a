import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  DollarSign, 
  Users, 
  FileText, 
  TrendingUp, 
  Loader2,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface DashboardStats {
  totalUsuarios: number;
  usuariosAtivos: number;
  totalDepositos: number;
  depositosAprovados: number;
  totalBilhetes: number;
  bilhetesHoje: number;
  saldoTotal: number;
  depositosHoje: number;
}

interface ChartData {
  data: string;
  depositos: number;
  bilhetes: number;
}

export const FinancialDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsuarios: 0,
    usuariosAtivos: 0,
    totalDepositos: 0,
    depositosAprovados: 0,
    totalBilhetes: 0,
    bilhetesHoje: 0,
    saldoTotal: 0,
    depositosHoje: 0
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      // Fetch users stats
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, saldo, bloqueado');

      const totalUsuarios = profiles?.length || 0;
      const usuariosAtivos = profiles?.filter(p => !p.bloqueado).length || 0;
      const saldoTotal = profiles?.reduce((acc, p) => acc + (p.saldo || 0), 0) || 0;

      // Fetch deposits stats
      const { data: transacoes } = await supabase
        .from('transacoes')
        .select('id, valor, status, created_at')
        .eq('tipo', 'deposito');

      const totalDepositos = transacoes?.length || 0;
      const depositosAprovados = transacoes?.filter(t => t.status === 'aprovado')
        .reduce((acc, t) => acc + Number(t.valor), 0) || 0;
      const depositosHoje = transacoes?.filter(t => 
        new Date(t.created_at) >= hoje && t.status === 'aprovado'
      ).reduce((acc, t) => acc + Number(t.valor), 0) || 0;

      // Fetch tickets stats
      const { data: bilhetes } = await supabase
        .from('bilhetes')
        .select('id, created_at');

      const totalBilhetes = bilhetes?.length || 0;
      const bilhetesHoje = bilhetes?.filter(b => new Date(b.created_at) >= hoje).length || 0;

      setStats({
        totalUsuarios,
        usuariosAtivos,
        totalDepositos,
        depositosAprovados,
        totalBilhetes,
        bilhetesHoje,
        saldoTotal,
        depositosHoje
      });

      // Prepare chart data (last 7 days)
      const last7Days: ChartData[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayDeposits = transacoes?.filter(t => {
          const tDate = new Date(t.created_at).toISOString().split('T')[0];
          return tDate === dateStr && t.status === 'aprovado';
        }).reduce((acc, t) => acc + Number(t.valor), 0) || 0;

        const dayTickets = bilhetes?.filter(b => {
          const bDate = new Date(b.created_at).toISOString().split('T')[0];
          return bDate === dateStr;
        }).length || 0;

        last7Days.push({
          data: date.toLocaleDateString('pt-AO', { day: '2-digit', month: '2-digit' }),
          depositos: dayDeposits / 1000, // Convert to thousands
          bilhetes: dayTickets
        });
      }
      setChartData(last7Days);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
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
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-300/70">Usuários Ativos</p>
                <p className="text-2xl font-bold text-blue-300">{stats.usuariosAtivos}</p>
                <p className="text-xs text-muted-foreground">de {stats.totalUsuarios} total</p>
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
                  <ArrowUpRight className="w-3 h-3 text-green-400" />
                  +{(stats.depositosHoje / 1000).toFixed(0)}k hoje
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
                  <ArrowUpRight className="w-3 h-3 text-purple-400" />
                  +{stats.bilhetesHoje} hoje
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
                <p className="text-xs text-amber-300/70">Saldo Total</p>
                <p className="text-2xl font-bold text-amber-300">{(stats.saldoTotal / 1000).toFixed(0)}k</p>
                <p className="text-xs text-muted-foreground">Kz na plataforma</p>
              </div>
              <TrendingUp className="w-8 h-8 text-amber-400/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deposits Chart */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Depósitos (últimos 7 dias)
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
                  formatter={(value: number) => [`${value}k Kz`, 'Depósitos']}
                />
                <Bar dataKey="depositos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
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
            Bilhetes Criados (últimos 7 dias)
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
    </div>
  );
};
