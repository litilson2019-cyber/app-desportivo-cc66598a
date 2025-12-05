import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Shield, 
  Search, 
  Loader2,
  Clock,
  User,
  Activity
} from 'lucide-react';

interface AdminLog {
  id: string;
  admin_id: string;
  acao: string;
  detalhes: any;
  ip_address: string | null;
  created_at: string;
}

export const AdminLogs = () => {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log =>
    log.acao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    JSON.stringify(log.detalhes).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-AO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getActionBadge = (acao: string) => {
    if (acao.includes('aprovar') || acao.includes('criar')) {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">{acao}</Badge>;
    }
    if (acao.includes('rejeitar') || acao.includes('excluir') || acao.includes('bloquear')) {
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">{acao}</Badge>;
    }
    if (acao.includes('atualizar') || acao.includes('editar')) {
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">{acao}</Badge>;
    }
    return <Badge variant="outline">{acao}</Badge>;
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
            <Activity className="w-8 h-8 text-primary" />
            <div>
              <p className="text-xs text-primary/70">Total de Logs</p>
              <p className="text-2xl font-bold text-primary">{logs.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="w-8 h-8 text-blue-400" />
            <div>
              <p className="text-xs text-blue-400/70">Últimas 24h</p>
              <p className="text-2xl font-bold text-blue-400">
                {logs.filter(l => {
                  const logDate = new Date(l.created_at);
                  const now = new Date();
                  return (now.getTime() - logDate.getTime()) < 24 * 60 * 60 * 1000;
                }).length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar ação ou detalhes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Logs List */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Logs de Auditoria
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {filteredLogs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {searchTerm ? 'Nenhum log encontrado' : 'Nenhum log registrado ainda'}
            </p>
          ) : (
            filteredLogs.map((log) => (
              <Card key={log.id} className="bg-background/50 border-border/30">
                <CardContent className="p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{log.admin_id.slice(0, 8)}...</span>
                    </div>
                    {getActionBadge(log.acao)}
                  </div>
                  
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                    <Clock className="w-3 h-3" />
                    {formatDate(log.created_at)}
                    {log.ip_address && (
                      <span className="ml-2">IP: {log.ip_address}</span>
                    )}
                  </p>

                  {log.detalhes && (
                    <div className="bg-background/50 rounded p-2 mt-2">
                      <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                        {JSON.stringify(log.detalhes, null, 2)}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};
