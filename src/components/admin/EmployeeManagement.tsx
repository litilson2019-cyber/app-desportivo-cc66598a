import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  UserPlus,
  Loader2,
  Edit2,
  Trash2,
  Ban,
  KeyRound,
  Search,
  Shield,
  Plus,
  Power,
  Users
} from 'lucide-react';

interface TeamProfile {
  id: string;
  nome: string;
  descricao: string | null;
}

interface Employee {
  id: string;
  nome_completo: string | null;
  email: string | null;
  telefone: string | null;
  tipo_conta: string | null;
  bloqueado: boolean | null;
  ativo: boolean | null;
  created_at: string | null;
  criado_por: string | null;
  criador_nome?: string | null;
  role_info?: {
    id: string;
    role: string;
    team_profile_id: string | null;
    team_profiles?: { nome: string } | null;
  };
}

export const EmployeeManagement = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [teamProfiles, setTeamProfiles] = useState<TeamProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    primeiro_nome: '',
    ultimo_nome: '',
    email: '',
    password: '',
    confirm_password: '',
    team_profile_id: '',
    role: 'moderator' as 'admin' | 'moderator',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Get team profiles
      const { data: profiles } = await supabase
        .from('team_profiles')
        .select('id, nome, descricao')
        .order('nome');

      if (profiles) setTeamProfiles(profiles);

      // Get employees (tipo_conta = admin or super_admin)
      const { data: employeeProfiles } = await supabase
        .from('profiles')
        .select('*')
        .in('tipo_conta', ['admin', 'super_admin'])
        .order('created_at', { ascending: false });

      if (employeeProfiles && employeeProfiles.length > 0) {
        const employeeIds = employeeProfiles.map((e) => e.id);

        // Get roles
        const { data: roles } = await supabase
          .from('user_roles')
          .select('id, user_id, role, team_profile_id, team_profiles:team_profile_id (nome)')
          .in('user_id', employeeIds);

        const rolesMap = new Map(roles?.map((r) => [r.user_id, r]) || []);

        // Get creator names
        const creatorIds = employeeProfiles
          .map((e) => e.criado_por)
          .filter(Boolean) as string[];
        
        let creatorsMap = new Map<string, string>();
        if (creatorIds.length > 0) {
          const { data: creators } = await supabase
            .from('profiles')
            .select('id, nome_completo')
            .in('id', creatorIds);
          creatorsMap = new Map(creators?.map((c) => [c.id, c.nome_completo || 'Admin']) || []);
        }

        const enriched: Employee[] = employeeProfiles.map((e) => ({
          ...e,
          role_info: rolesMap.get(e.id) as Employee['role_info'],
          criador_nome: e.criado_por ? creatorsMap.get(e.criado_por) || 'Admin' : null,
        }));

        setEmployees(enriched);
      } else {
        setEmployees([]);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Erro ao carregar funcionários');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      primeiro_nome: '',
      ultimo_nome: '',
      email: '',
      password: '',
      confirm_password: '',
      team_profile_id: '',
      role: 'moderator',
    });
  };

  const handleCreate = async () => {
    if (!form.primeiro_nome.trim() || !form.ultimo_nome.trim() || !form.email.trim() || !form.password || !form.team_profile_id) {
      toast.error('Todos os campos são obrigatórios');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Senha deve ter no mínimo 6 caracteres');
      return;
    }
    if (form.password !== form.confirm_password) {
      toast.error('As senhas não coincidem');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-employee', {
        body: {
          primeiro_nome: form.primeiro_nome.trim(),
          ultimo_nome: form.ultimo_nome.trim(),
          email: form.email.trim(),
          password: form.password,
          team_profile_id: form.team_profile_id,
          role: form.role,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Funcionário criado com sucesso!');
      setShowCreateModal(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Error creating employee:', error);
      toast.error(error.message || 'Erro ao criar funcionário');
    } finally {
      setSaving(false);
    }
  };

  const handleBlock = async (employee: Employee) => {
    const newStatus = !employee.bloqueado;
    try {
      await supabase
        .from('profiles')
        .update({ bloqueado: newStatus })
        .eq('id', employee.id);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('admin_logs').insert({
          admin_id: user.id,
          acao: newStatus ? 'bloquear_funcionario' : 'desbloquear_funcionario',
          detalhes: { funcionario_id: employee.id, nome: employee.nome_completo },
        });
      }

      toast.success(newStatus ? 'Funcionário bloqueado' : 'Funcionário desbloqueado');
      fetchData();
    } catch (error) {
      toast.error('Erro ao alterar status');
    }
  };

  const handleToggleActive = async (employee: Employee) => {
    const newStatus = !employee.ativo;
    try {
      await supabase
        .from('profiles')
        .update({ ativo: newStatus })
        .eq('id', employee.id);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('admin_logs').insert({
          admin_id: user.id,
          acao: newStatus ? 'ativar_funcionario' : 'desativar_funcionario',
          detalhes: { funcionario_id: employee.id, nome: employee.nome_completo },
        });
      }

      toast.success(newStatus ? 'Funcionário ativado' : 'Funcionário desativado');
      fetchData();
    } catch (error) {
      toast.error('Erro ao alterar status');
    }
  };

  const handleResetPassword = async (employee: Employee) => {
    if (!confirm(`Resetar senha de ${employee.nome_completo}?`)) return;
    try {
      const { data, error } = await supabase.functions.invoke('reset-user-password', {
        body: { userId: employee.id, newPassword: 'luanda2026' },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('admin_logs').insert({
          admin_id: user.id,
          acao: 'resetar_senha_funcionario',
          detalhes: { funcionario_id: employee.id, nome: employee.nome_completo },
        });
      }

      toast.success('Senha resetada para: luanda2026');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao resetar senha');
    }
  };

  const handleDelete = async (employee: Employee) => {
    if (!confirm(`Tem certeza que deseja excluir ${employee.nome_completo}? Esta ação não pode ser desfeita.`)) return;
    try {
      // Remove role first
      if (employee.role_info?.id) {
        await supabase.from('user_roles').delete().eq('id', employee.role_info.id);
      }
      // Mark as inactive and change tipo_conta
      await supabase
        .from('profiles')
        .update({ ativo: false, tipo_conta: 'deleted' })
        .eq('id', employee.id);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('admin_logs').insert({
          admin_id: user.id,
          acao: 'excluir_funcionario',
          detalhes: { funcionario_id: employee.id, nome: employee.nome_completo },
        });
      }

      toast.success('Funcionário excluído');
      fetchData();
    } catch (error) {
      toast.error('Erro ao excluir funcionário');
    }
  };

  const handleEditProfile = async () => {
    if (!editingEmployee || !form.team_profile_id) return;
    setSaving(true);
    try {
      if (editingEmployee.role_info?.id) {
        await supabase
          .from('user_roles')
          .update({
            team_profile_id: form.team_profile_id,
            role: form.role,
          })
          .eq('id', editingEmployee.role_info.id);
      }

      // Update tipo_conta based on role
      const tipoConta = form.role === 'admin' ? 'super_admin' : 'admin';
      await supabase
        .from('profiles')
        .update({ tipo_conta: tipoConta })
        .eq('id', editingEmployee.id);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('admin_logs').insert({
          admin_id: user.id,
          acao: 'editar_funcionario',
          detalhes: {
            funcionario_id: editingEmployee.id,
            nome: editingEmployee.nome_completo,
            novo_perfil: form.team_profile_id,
          },
        });
      }

      toast.success('Perfil atualizado!');
      setShowEditModal(false);
      setEditingEmployee(null);
      fetchData();
    } catch (error) {
      toast.error('Erro ao atualizar');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setForm((prev) => ({
      ...prev,
      team_profile_id: emp.role_info?.team_profile_id || '',
      role: emp.role_info?.role === 'admin' ? 'admin' : 'moderator',
    }));
    setShowEditModal(true);
  };

  const filteredEmployees = employees.filter(
    (e) =>
      e.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.telefone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Users className="w-5 h-5" />
          Funcionários ({employees.length})
        </h2>
        <Button size="sm" onClick={() => { resetForm(); setShowCreateModal(true); }}>
          <UserPlus className="w-4 h-4 mr-1" /> Cadastrar
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, email ou telefone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Employee List */}
      <div className="space-y-2">
        {filteredEmployees.length === 0 ? (
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum funcionário encontrado
            </CardContent>
          </Card>
        ) : (
          filteredEmployees.map((emp) => (
            <Card key={emp.id} className="bg-card/50 backdrop-blur border-border/50">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{emp.nome_completo || 'Sem nome'}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {emp.email || emp.telefone || 'Sem contacto'}
                    </p>
                    <div className="flex flex-wrap items-center gap-1 mt-1">
                      <Badge
                        variant={emp.role_info?.role === 'admin' ? 'default' : 'secondary'}
                        className="text-[10px]"
                      >
                        {emp.role_info?.role === 'admin' ? 'Super Admin' : 'Moderador'}
                      </Badge>
                      {emp.role_info?.team_profiles?.nome && (
                        <Badge variant="outline" className="text-[10px]">
                          {emp.role_info.team_profiles.nome}
                        </Badge>
                      )}
                      <Badge
                        variant={emp.bloqueado ? 'destructive' : emp.ativo === false ? 'secondary' : 'default'}
                        className="text-[10px]"
                      >
                        {emp.bloqueado ? 'Bloqueado' : emp.ativo === false ? 'Inativo' : 'Ativo'}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Criado em: {emp.created_at ? new Date(emp.created_at).toLocaleDateString('pt-BR') : '-'}
                      {emp.criador_nome && ` • Por: ${emp.criador_nome}`}
                    </p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-1 mt-2 border-t border-border/30 pt-2">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEdit(emp)}>
                    <Edit2 className="w-3 h-3 mr-1" /> Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleBlock(emp)}
                  >
                    <Ban className="w-3 h-3 mr-1" />
                    {emp.bloqueado ? 'Desbloquear' : 'Bloquear'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleToggleActive(emp)}
                  >
                    <Power className="w-3 h-3 mr-1" />
                    {emp.ativo === false ? 'Ativar' : 'Desativar'}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleResetPassword(emp)}>
                    <KeyRound className="w-3 h-3 mr-1" /> Senha
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-destructive"
                    onClick={() => handleDelete(emp)}
                  >
                    <Trash2 className="w-3 h-3 mr-1" /> Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Cadastrar Funcionário
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Primeiro Nome *</Label>
              <Input
                value={form.primeiro_nome}
                onChange={(e) => setForm({ ...form, primeiro_nome: e.target.value })}
                placeholder="Primeiro nome"
              />
            </div>
            <div>
              <Label>Último Nome *</Label>
              <Input
                value={form.ultimo_nome}
                onChange={(e) => setForm({ ...form, ultimo_nome: e.target.value })}
                placeholder="Último nome"
              />
            </div>
            <div>
              <Label>Email ou Telefone *</Label>
              <Input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@exemplo.com ou 923000000"
              />
            </div>
            <div>
              <Label>Senha *</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div>
              <Label>Confirmar Senha *</Label>
              <Input
                type="password"
                value={form.confirm_password}
                onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                placeholder="Repita a senha"
              />
            </div>
            <div>
              <Label>Nível de Acesso *</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v as 'admin' | 'moderator' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar nível" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Super Admin</SelectItem>
                  <SelectItem value="moderator">Moderador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Perfil/Função *</Label>
              <Select
                value={form.team_profile_id}
                onValueChange={(v) => setForm({ ...form, team_profile_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar perfil" />
                </SelectTrigger>
                <SelectContent>
                  {teamProfiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <UserPlus className="w-4 h-4 mr-1" />}
              Criar Conta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Editar Funcionário</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {editingEmployee?.nome_completo} - {editingEmployee?.email}
            </p>
            <div>
              <Label>Nível de Acesso</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v as 'admin' | 'moderator' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Super Admin</SelectItem>
                  <SelectItem value="moderator">Moderador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Perfil/Função</Label>
              <Select
                value={form.team_profile_id}
                onValueChange={(v) => setForm({ ...form, team_profile_id: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {teamProfiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditProfile} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
