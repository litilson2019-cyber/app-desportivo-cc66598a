import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Users, FileText } from 'lucide-react';

interface QuickStatsProps {
  onNavigate?: (tab: string) => void;
}

export const QuickStats = ({ onNavigate }: QuickStatsProps) => {
  const [stats, setStats] = useState({
    depositosPendentes: 0,
    usuariosHoje: 0,
    bilhetesHoje: 0
  });

  useEffect(() => {
    fetchStats();

    // Realtime subscription
    const channel = supabase
      .channel('quick-stats')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transacoes'
        },
        () => fetchStats()
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'profiles'
        },
        () => fetchStats()
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bilhetes'
        },
        () => fetchStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStats = async () => {
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const [transacoesRes, profilesRes, bilhetesRes] = await Promise.all([
        supabase
          .from('transacoes')
          .select('id, tipo, status')
          .eq('tipo', 'deposito'),
        supabase
          .from('profiles')
          .select('id, created_at')
          .gte('created_at', hoje.toISOString()),
        supabase
          .from('bilhetes')
          .select('id, created_at')
          .gte('created_at', hoje.toISOString())
      ]);

      const transacoes = transacoesRes.data || [];
      const depositosPendentes = transacoes.filter(
        t => t.status === 'pendente'
      ).length;

      setStats({
        depositosPendentes,
        usuariosHoje: profilesRes.data?.length || 0,
        bilhetesHoje: bilhetesRes.data?.length || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const items = [
    {
      icon: DollarSign,
      label: 'Dep.',
      value: stats.depositosPendentes,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20',
      tab: 'depositos',
      show: stats.depositosPendentes > 0
    },
    {
      icon: Users,
      label: 'Novos',
      value: stats.usuariosHoje,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      tab: 'usuarios',
      show: stats.usuariosHoje > 0
    },
    {
      icon: FileText,
      label: 'Bilh.',
      value: stats.bilhetesHoje,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      tab: 'bilhetes',
      show: stats.bilhetesHoje > 0
    }
  ];

  const visibleItems = items.filter(item => item.show);

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        return (
          <Badge
            key={item.tab}
            variant="outline"
            className={`cursor-pointer ${item.bgColor} border-transparent hover:border-border transition-colors`}
            onClick={() => onNavigate?.(item.tab)}
          >
            <Icon className={`w-3 h-3 mr-1 ${item.color}`} />
            <span className={item.color}>{item.value}</span>
            <span className="text-muted-foreground ml-1">{item.label}</span>
          </Badge>
        );
      })}
    </div>
  );
};
