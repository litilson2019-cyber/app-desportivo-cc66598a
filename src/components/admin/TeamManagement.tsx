import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Users, 
  Shield, 
  Loader2, 
  Plus, 
  Edit2, 
  Trash2,
  UserPlus,
  Settings,
  Eye,
  DollarSign,
  FileText,
  BarChart3,
  ClipboardList
} from 'lucide-react';

interface TeamProfile {
  id: string;
  nome: string;
  descricao: string | null;
  permissoes: Record<string, boolean>;
}

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  team_profile_id: string | null;
  created_at: string;
  profiles?: {
    nome_completo: string | null;
  };
  team_profiles?: {
    nome: string;
  } | null;
}

const PERMISSION_LABELS: Record<string, { label: string; icon: React.ReactNode; description: string }> = {
  dashboard: { 
    label: 'Dashboard', 
    icon: <BarChart3 className="w-4 h-4" />,
    description: 'Ver métricas financeiras e estatísticas'
  },
  depositos: { 
    label: 'Depósitos', 
    icon: <DollarSign className="w-4 h-4" />,
    description: 'Ver, aprovar e rejeitar depósitos'
  },
  usuarios: { 
    label: 'Usuários', 
    icon: <Users className="w-4 h-4" />,
    description: 'Gerenciar contas de usuários'
  },
  bilhetes: { 
    label: 'Bilhetes', 
    icon: <FileText className="w-4 h-4" />,
    description: 'Ver bilhetes criados'
  },
  configuracoes: { 
    label: 'Configurações', 
    icon: <Settings className="w-4 h-4" />,
    description: 'Alterar preços, banners e métodos'
  },
  logs: { 
    label: 'Logs', 
    icon: <ClipboardList className="w-4 h-4" />,
    description: 'Ver histórico de ações'
  },
  gerenciar_equipa: { 
    label: 'Gestão de Equipa', 
    icon: <Shield className="w-4 h-4" />,
    description: 'Adicionar/remover membros da equipa'
  }
};

export const TeamManagement = () => {
  const [profiles, setProfiles] = useState<TeamProfile[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('membros');
  
  // Profile modal
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<TeamProfile | null>(null);
  const [profileForm, setProfileForm] = useState({
    nome: '',
    descricao: '',
    permissoes: {} as Record<string, boolean>
  });
  
  // Member modal
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberForm, setMemberForm] = useState({
    email: '',
    team_profile_id: ''
  });
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [profilesRes, membersRes] = await Promise.all([
        supabase.from('team_profiles').select('*').order('nome'),
        supabase
          .from('user_roles')
          .select(`
            *,
            team_profiles:team_profile_id (nome)
          `)
          .in('role', ['admin', 'moderator'])
          .order('created_at', { ascending: false })
      ]);

      if (profilesRes.data) setProfiles(profilesRes.data as TeamProfile[]);
      
      if (membersRes.data) {
        // Buscar nomes dos usuários separadamente
        const memberIds = membersRes.data.map(m => m.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, nome_completo')
          .in('id', memberIds);
        
        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
        
        const membersWithProfiles = membersRes.data.map(m => ({
          ...m,
          profiles: profilesMap.get(m.user_id) || { nome_completo: null }
        }));
        
        setMembers(membersWithProfiles as TeamMember[]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profileForm.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    setSaving(true);
    try {
      if (editingProfile) {
        await supabase
          .from('team_profiles')
          .update({
            nome: profileForm.nome,
            descricao: profileForm.descricao,
            permissoes: profileForm.permissoes,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingProfile.id);
        toast.success('Perfil atualizado!');
      } else {
        await supabase.from('team_profiles').insert({
          nome: profileForm.nome,
          descricao: profileForm.descricao,
          permissoes: profileForm.permissoes
        });
        toast.success('Perfil criado!');
      }
      setShowProfileModal(false);
      setEditingProfile(null);
      resetProfileForm();
      fetchData();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Erro ao salvar perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProfile = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este perfil?')) return;
    
    try {
      await supabase.from('team_profiles').delete().eq('id', id);
      toast.success('Perfil excluído!');
      fetchData();
    } catch (error) {
      console.error('Error deleting profile:', error);
      toast.error('Erro ao excluir perfil');
    }
  };

  const handleAddMember = async () => {
    if (!memberForm.email.trim() || !memberForm.team_profile_id) {
      toast.error('Email e perfil são obrigatórios');
      return;
    }

    setSaving(true);
    try {
      // Buscar usuário pelo email na tabela auth (via profiles ou outro método)
      // Por simplicidade, vamos buscar na tabela profiles pelo nome
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .ilike('nome_completo', `%${memberForm.email}%`)
        .maybeSingle();

      if (profileError || !profile) {
        toast.error('Usuário não encontrado');
        setSaving(false);
        return;
      }

      // Verificar se já tem role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (existingRole) {
        // Atualizar role existente
        await supabase
          .from('user_roles')
          .update({
            role: 'moderator',
            team_profile_id: memberForm.team_profile_id
          })
          .eq('id', existingRole.id);
      } else {
        // Criar nova role
        await supabase.from('user_roles').insert({
          user_id: profile.id,
          role: 'moderator',
          team_profile_id: memberForm.team_profile_id
        });
      }

      toast.success('Membro adicionado à equipa!');
      setShowMemberModal(false);
      setMemberForm({ email: '', team_profile_id: '' });
      fetchData();
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error('Erro ao adicionar membro');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateMemberProfile = async (memberId: string, profileId: string) => {
    try {
      await supabase
        .from('user_roles')
        .update({ team_profile_id: profileId })
        .eq('id', memberId);
      toast.success('Perfil atualizado!');
      fetchData();
    } catch (error) {
      console.error('Error updating member:', error);
      toast.error('Erro ao atualizar');
    }
  };

  const handleRemoveMember = async (memberId: string, userId: string, role: string) => {
    if (role === 'admin') {
      toast.error('Não é possível remover um administrador');
      return;
    }
    
    if (!confirm('Remover este membro da equipa?')) return;

    try {
      await supabase.from('user_roles').delete().eq('id', memberId);
      toast.success('Membro removido!');
      fetchData();
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Erro ao remover membro');
    }
  };

  const resetProfileForm = () => {
    setProfileForm({
      nome: '',
      descricao: '',
      permissoes: {
        dashboard: false,
        depositos: false,
        usuarios: false,
        bilhetes: false,
        configuracoes: false,
        logs: false,
        gerenciar_equipa: false
      }
    });
  };

  const openEditProfile = (profile: TeamProfile) => {
    setEditingProfile(profile);
    setProfileForm({
      nome: profile.nome,
      descricao: profile.descricao || '',
      permissoes: profile.permissoes
    });
    setShowProfileModal(true);
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
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-2 mb-4">
          <TabsTrigger value="membros" className="text-xs">
            <Users className="w-3.5 h-3.5 mr-1" />
            Membros
          </TabsTrigger>
          <TabsTrigger value="perfis" className="text-xs">
            <Shield className="w-3.5 h-3.5 mr-1" />
            Perfis
          </TabsTrigger>
        </TabsList>

        {/* Membros Tab */}
        <TabsContent value="membros" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowMemberModal(true)}>
              <UserPlus className="w-4 h-4 mr-1" /> Adicionar Membro
            </Button>
          </div>

          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" />
                Equipa Administrativa ({members.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {members.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum membro na equipa</p>
              ) : (
                members.map((member) => (
                  <Card key={member.id} className="bg-background/50 border-border/30">
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {member.profiles?.nome_completo || 'Usuário'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={member.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                            {member.role === 'admin' ? 'Admin' : 'Moderador'}
                          </Badge>
                          {member.team_profiles?.nome && (
                            <Badge variant="outline" className="text-xs">
                              {member.team_profiles.nome}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <Select
                        value={member.team_profile_id || ''}
                        onValueChange={(value) => handleUpdateMemberProfile(member.id, value)}
                        disabled={member.role === 'admin'}
                      >
                        <SelectTrigger className="w-[140px] h-8 text-xs">
                          <SelectValue placeholder="Perfil" />
                        </SelectTrigger>
                        <SelectContent>
                          {profiles.map((profile) => (
                            <SelectItem key={profile.id} value={profile.id}>
                              {profile.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {member.role !== 'admin' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMember(member.id, member.user_id, member.role)}
                          className="text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Perfis Tab */}
        <TabsContent value="perfis" className="space-y-4">
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => {
                resetProfileForm();
                setEditingProfile(null);
                setShowProfileModal(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1" /> Novo Perfil
            </Button>
          </div>

          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardContent className="p-4 space-y-2">
              {profiles.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum perfil cadastrado</p>
              ) : (
                profiles.map((profile) => (
                  <Card key={profile.id} className="bg-background/50 border-border/30">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm">{profile.nome}</p>
                          <p className="text-xs text-muted-foreground">{profile.descricao}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditProfile(profile)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          {profile.nome !== 'Admin' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteProfile(profile.id)}
                              className="text-red-400"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(profile.permissoes)
                          .filter(([_, enabled]) => enabled)
                          .map(([key]) => (
                            <Badge key={key} variant="secondary" className="text-xs">
                              {PERMISSION_LABELS[key]?.label || key}
                            </Badge>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Profile Modal */}
      <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}>
        <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProfile ? 'Editar Perfil' : 'Novo Perfil'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Nome *</label>
              <Input
                value={profileForm.nome}
                onChange={(e) => setProfileForm({ ...profileForm, nome: e.target.value })}
                disabled={editingProfile?.nome === 'Admin'}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Descrição</label>
              <Input
                value={profileForm.descricao}
                onChange={(e) => setProfileForm({ ...profileForm, descricao: e.target.value })}
              />
            </div>
            
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Permissões</label>
              <div className="space-y-2">
                {Object.entries(PERMISSION_LABELS).map(([key, { label, icon, description }]) => (
                  <div key={key} className="flex items-center justify-between p-2 rounded-lg bg-background/50">
                    <div className="flex items-center gap-2">
                      {icon}
                      <div>
                        <p className="text-sm font-medium">{label}</p>
                        <p className="text-xs text-muted-foreground">{description}</p>
                      </div>
                    </div>
                    <Switch
                      checked={profileForm.permissoes[key] || false}
                      onCheckedChange={(checked) => 
                        setProfileForm({
                          ...profileForm,
                          permissoes: { ...profileForm.permissoes, [key]: checked }
                        })
                      }
                      disabled={editingProfile?.nome === 'Admin'}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProfileModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveProfile} disabled={saving || !profileForm.nome.trim()}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Member Modal */}
      <Dialog open={showMemberModal} onOpenChange={setShowMemberModal}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Adicionar Membro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Nome do Usuário *</label>
              <Input
                value={memberForm.email}
                onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                placeholder="Digite o nome do usuário"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Perfil *</label>
              <Select
                value={memberForm.team_profile_id}
                onValueChange={(value) => setMemberForm({ ...memberForm, team_profile_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um perfil" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMemberModal(false)}>Cancelar</Button>
            <Button 
              onClick={handleAddMember} 
              disabled={saving || !memberForm.email.trim() || !memberForm.team_profile_id}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
