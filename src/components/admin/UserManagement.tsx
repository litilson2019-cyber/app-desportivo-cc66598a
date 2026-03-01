import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatKz } from '@/lib/formatKz';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Users,
  Search,
  Lock,
  Unlock,
  DollarSign,
  History,
  Eye,
  Loader2,
  Plus,
  Minus,
  FileText
} from 'lucide-react';

interface Profile {
  id: string;
  nome_completo: string | null;
  saldo: number;
  bloqueado: boolean;
  created_at: string;
  invited_count?: number;
}

interface Transacao {
  id: string;
  valor: number;
  tipo: string;
  status: string;
  banco: string | null;
  created_at: string;
}

interface Bilhete {
  id: string;
  modo: string | null;
  status: string | null;
  odds_totais: number | null;
  created_at: string;
}

interface AjusteSaldo {
  id: string;
  valor: number;
  tipo: string;
  motivo: string | null;
  saldo_anterior: number;
  saldo_novo: number;
  created_at: string;
}

export const UserManagement = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);

  // Modal states
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [adjustType, setAdjustType] = useState<'adicionar' | 'remover'>('adicionar');
  const [adjustValue, setAdjustValue] = useState('');
  const [adjustMotivo, setAdjustMotivo] = useState('');
  const [processing, setProcessing] = useState(false);

  const generateSimplePassword = Math.floor(100000 + Math.random() * 900000);

  // History data
  const [userTransacoes, setUserTransacoes] = useState<Transacao[]>([]);
  const [userBilhetes, setUserBilhetes] = useState<Bilhete[]>([]);
  const [userAjustes, setUserAjustes] = useState<AjusteSaldo[]>([]);
  const [historyTab, setHistoryTab] = useState<'depositos' | 'bilhetes' | 'ajustes'>('depositos');
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get invited counts for each user
      const { data: invites } = await supabase
        .from('invited_users')
        .select('referrer_id');

      const inviteCounts = invites?.reduce((acc, inv) => {
        acc[inv.referrer_id] = (acc[inv.referrer_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const usersWithCounts = (profiles || []).map(p => ({
        ...p,
        bloqueado: p.bloqueado || false,
        invited_count: inviteCounts[p.id] || 0
      }));

      setUsers(usersWithCounts);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  // Função para registrar log de ação administrativa
  const logAdminAction = async (acao: string, detalhes: Record<string, string | number | boolean | null | undefined>) => {
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

  const handleBlockUser = async (user: Profile) => {
    try {
      const newStatus = !user.bloqueado;
      const { error } = await supabase
        .from('profiles')
        .update({ bloqueado: newStatus })
        .eq('id', user.id);

      if (error) throw error;

      // Registrar log de bloqueio/desbloqueio
      await logAdminAction(newStatus ? 'bloquear_usuario' : 'desbloquear_usuario', {
        user_id: user.id,
        user_nome: user.nome_completo,
        novo_status: newStatus
      });

      toast.success(newStatus ? 'Usuário bloqueado' : 'Usuário desbloqueado');
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Erro ao atualizar usuário');
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;

    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sessão não encontrada');



      const response = await supabase.functions.invoke('reset-user-password', {
        body: { userId: selectedUser.id, newPassword: generateSimplePassword },
      });

      if (response.error) throw new Error(response.error.message || 'Erro ao resetar senha');

      // Registrar log de reset de senha
      await logAdminAction('resetar_senha', {
        user_id: selectedUser.id,
        user_nome: selectedUser.nome_completo
      });

      toast.success('Senha resetada com sucesso:' + generateSimplePassword);
      setShowResetPasswordModal(false);
      setSelectedUser(null);
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast.error(error.message || 'Erro ao resetar senha');
    } finally {
      setProcessing(false);
    }
  };

  const handleAdjustBalance = async () => {
    if (!selectedUser || !adjustValue) return;

    setProcessing(true);
    try {
      const { data: { user: admin } } = await supabase.auth.getUser();
      const valor = parseFloat(adjustValue);
      const saldoAnterior = selectedUser.saldo || 0;
      const saldoNovo = adjustType === 'adicionar'
        ? saldoAnterior + valor
        : Math.max(0, saldoAnterior - valor);

      // Update user balance
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ saldo: saldoNovo })
        .eq('id', selectedUser.id);

      if (updateError) throw updateError;

      // Record adjustment
      const { error: logError } = await supabase
        .from('ajustes_saldo')
        .insert({
          user_id: selectedUser.id,
          admin_id: admin?.id,
          valor,
          tipo: adjustType,
          motivo: adjustMotivo || null,
          saldo_anterior: saldoAnterior,
          saldo_novo: saldoNovo
        });

      if (logError) throw logError;

      // Registrar log de ajuste de saldo
      await logAdminAction(adjustType === 'adicionar' ? 'creditar_bonus' : 'debitar_saldo', {
        user_id: selectedUser.id,
        user_nome: selectedUser.nome_completo,
        valor,
        saldo_anterior: saldoAnterior,
        saldo_novo: saldoNovo,
        motivo: adjustMotivo || null
      });

      toast.success(`Saldo ${adjustType === 'adicionar' ? 'adicionado' : 'removido'} com sucesso`);
      setShowAdjustModal(false);
      setAdjustValue('');
      setAdjustMotivo('');
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Error adjusting balance:', error);
      toast.error('Erro ao ajustar saldo');
    } finally {
      setProcessing(false);
    }
  };

  const handleViewHistory = async (user: Profile) => {
    setSelectedUser(user);
    setHistoryLoading(true);
    setShowHistoryModal(true);
    setHistoryTab('depositos');

    try {
      // Fetch deposits
      const { data: transacoes } = await supabase
        .from('transacoes')
        .select('id, valor, tipo, status, banco, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Fetch tickets
      const { data: bilhetes } = await supabase
        .from('bilhetes')
        .select('id, modo, status, odds_totais, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Fetch balance adjustments
      const { data: ajustes } = await supabase
        .from('ajustes_saldo')
        .select('id, valor, tipo, motivo, saldo_anterior, saldo_novo, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setUserTransacoes(transacoes || []);
      setUserBilhetes(bilhetes || []);
      setUserAjustes(ajustes || []);
    } catch (error) {
      console.error('Error fetching history:', error);
      toast.error('Erro ao carregar histórico');
    } finally {
      setHistoryLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            <div>
              <p className="text-xs text-primary/70">Total Usuários</p>
              <p className="text-2xl font-bold text-primary">{users.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <Lock className="w-8 h-8 text-red-400" />
            <div>
              <p className="text-xs text-red-400/70">Bloqueados</p>
              <p className="text-2xl font-bold text-red-400">
                {users.filter(u => u.bloqueado).length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            Usuários ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {filteredUsers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum usuário encontrado
            </p>
          ) : (
            filteredUsers.map((user) => (
              <Card key={user.id} className="bg-background/50 border-border/30">
                <CardContent className="p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-foreground">
                        {user.nome_completo || 'Sem nome'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Cadastro: {formatDate(user.created_at)}
                      </p>
                    </div>
                    {user.bloqueado ? (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                        <Lock className="w-3 h-3 mr-1" /> Bloqueado
                      </Badge>
                    ) : (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        Ativo
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div className="bg-background/50 rounded p-2">
                      <span className="text-muted-foreground">Saldo:</span>
                      <span className="ml-1 font-medium text-primary">
                        {formatKz(user.saldo || 0)}
                      </span>
                    </div>
                    <div className="bg-background/50 rounded p-2">
                      <span className="text-muted-foreground">Convidados:</span>
                      <span className="ml-1 font-medium">{user.invited_count || 0}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewHistory(user)}
                      className="flex-1"
                    >
                      <History className="w-3 h-3 mr-1" />
                      Histórico
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(user);
                        setShowAdjustModal(true);
                      }}
                      className="flex-1"
                    >
                      <DollarSign className="w-3 h-3 mr-1" />
                      Saldo
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(user);
                        setShowResetPasswordModal(true);
                      }}
                      className="flex-1"
                    >
                      <DollarSign className="w-3 h-3 mr-1" />
                      Resetar Senha
                    </Button>
                    <Button
                      variant={user.bloqueado ? 'default' : 'destructive'}
                      size="sm"
                      onClick={() => handleBlockUser(user)}
                      className="flex-1"
                    >
                      {user.bloqueado ? (
                        <>
                          <Unlock className="w-3 h-3 mr-1" />
                          Desbloquear
                        </>
                      ) : (
                        <>
                          <Lock className="w-3 h-3 mr-1" />
                          Bloquear
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      {/* Adjust Balance Modal */}
      <Dialog open={showAdjustModal} onOpenChange={() => {
        setShowAdjustModal(false);
        setSelectedUser(null);
        setAdjustValue('');
        setAdjustMotivo('');
      }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Ajustar Saldo</DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Usuário: <span className="text-foreground">{selectedUser.nome_completo}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Saldo atual: <span className="text-primary font-medium">{formatKz(selectedUser.saldo || 0)}</span>
              </p>

              <Select value={adjustType} onValueChange={(v) => setAdjustType(v as 'adicionar' | 'remover')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="adicionar">
                    <span className="flex items-center gap-2">
                      <Plus className="w-4 h-4 text-green-500" /> Adicionar
                    </span>
                  </SelectItem>
                  <SelectItem value="remover">
                    <span className="flex items-center gap-2">
                      <Minus className="w-4 h-4 text-red-500" /> Remover
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="number"
                placeholder="Valor (Kz)"
                value={adjustValue}
                onChange={(e) => setAdjustValue(e.target.value)}
              />

              <Textarea
                placeholder="Motivo do ajuste..."
                value={adjustMotivo}
                onChange={(e) => setAdjustMotivo(e.target.value)}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdjustModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAdjustBalance}
              disabled={processing || !adjustValue}
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>








      {/* Reset Password Modal */}
      <Dialog open={showResetPasswordModal} onOpenChange={() => {
        setShowResetPasswordModal(false);
        setSelectedUser(null);
      }}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Resetar Senha - {selectedUser?.nome_completo}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-2">
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja resetar a senha do usuário "{selectedUser?.nome_completo}"?
            </p> <br />
            <p>
              A nova senha será: <span className="text-primary font-medium">"{generateSimplePassword}"</span>
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetPasswordModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={processing}
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Modal */}
      <Dialog open={showHistoryModal} onOpenChange={() => {
        setShowHistoryModal(false);
        setSelectedUser(null);
      }}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Histórico - {selectedUser?.nome_completo}
            </DialogTitle>
          </DialogHeader>

          <div className="flex gap-2 mb-4">
            <Button
              variant={historyTab === 'depositos' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setHistoryTab('depositos')}
            >
              Depósitos
            </Button>
            <Button
              variant={historyTab === 'bilhetes' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setHistoryTab('bilhetes')}
            >
              Bilhetes
            </Button>
            <Button
              variant={historyTab === 'ajustes' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setHistoryTab('ajustes')}
            >
              Ajustes
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            {historyLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : historyTab === 'depositos' ? (
              userTransacoes.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum depósito</p>
              ) : (
                userTransacoes.map((t) => (
                  <Card key={t.id} className="bg-background/50 border-border/30">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-primary">{formatKz(t.valor)}</p>
                          <p className="text-xs text-muted-foreground">{t.banco} • {formatDate(t.created_at)}</p>
                        </div>
                        <Badge className={
                          t.status === 'aprovado' ? 'bg-green-500/20 text-green-400' :
                            t.status === 'rejeitado' ? 'bg-red-500/20 text-red-400' :
                              'bg-yellow-500/20 text-yellow-400'
                        }>
                          {t.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )
            ) : historyTab === 'bilhetes' ? (
              userBilhetes.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum bilhete</p>
              ) : (
                userBilhetes.map((b) => (
                  <Card key={b.id} className="bg-background/50 border-border/30">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">
                            {b.modo === 'arriscado' ? '🔵 Modo Risco' : '🟢 Modo Seguro'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Odds: {b.odds_totais?.toFixed(2) || '-'} • {formatDate(b.created_at)}
                          </p>
                        </div>
                        <Badge className={
                          b.status === 'ganhou' ? 'bg-green-500/20 text-green-400' :
                            b.status === 'perdeu' ? 'bg-red-500/20 text-red-400' :
                              'bg-blue-500/20 text-blue-400'
                        }>
                          {b.status || 'pendente'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )
            ) : (
              userAjustes.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum ajuste</p>
              ) : (
                userAjustes.map((a) => (
                  <Card key={a.id} className="bg-background/50 border-border/30">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className={`font-medium ${a.tipo === 'adicionar' ? 'text-green-400' : 'text-red-400'}`}>
                            {a.tipo === 'adicionar' ? '+' : '-'}{formatKz(a.valor)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatKz(a.saldo_anterior)} → {formatKz(a.saldo_novo)}
                          </p>
                          {a.motivo && <p className="text-xs text-muted-foreground mt-1">{a.motivo}</p>}
                        </div>
                        <span className="text-xs text-muted-foreground">{formatDate(a.created_at)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
