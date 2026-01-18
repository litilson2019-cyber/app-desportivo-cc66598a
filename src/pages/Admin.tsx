import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeamPermissions } from '@/hooks/useTeamPermissions';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  ArrowLeft,
  Loader2,
  Users,
  DollarSign,
  FileText,
  BarChart3,
  Settings,
  ClipboardList,
  UserCog,
  Link2
} from 'lucide-react';
import { toast } from 'sonner';
import { DepositsManagement } from '@/components/admin/DepositsManagement';
import { UserManagement } from '@/components/admin/UserManagement';
import { FinancialDashboard } from '@/components/admin/FinancialDashboard';
import { TicketsManagement } from '@/components/admin/TicketsManagement';
import { SystemSettings } from '@/components/admin/SystemSettings';
import { AdminLogs } from '@/components/admin/AdminLogs';
import { TeamManagement } from '@/components/admin/TeamManagement';
import { ReferralsManagement } from '@/components/admin/ReferralsManagement';
import { AdminNotifications } from '@/components/admin/AdminNotifications';
import { QuickStats } from '@/components/admin/QuickStats';

const Admin = () => {
  const navigate = useNavigate();
  const { permissions, loading, hasAccess } = useTeamPermissions();
  const [activeTab, setActiveTab] = useState('');

  // Determinar a primeira tab disponível baseado nas permissões
  useEffect(() => {
    if (!loading && hasAccess) {
      if (permissions.dashboard) {
        setActiveTab('dashboard');
      } else if (permissions.depositos) {
        setActiveTab('depositos');
      } else if (permissions.usuarios) {
        setActiveTab('usuarios');
      } else if (permissions.bilhetes) {
        setActiveTab('bilhetes');
      } else if (permissions.configuracoes) {
        setActiveTab('configuracoes');
      } else if (permissions.logs) {
        setActiveTab('logs');
      } else if (permissions.gerenciar_equipa) {
        setActiveTab('equipa');
      }
    }
  }, [loading, hasAccess, permissions]);

  useEffect(() => {
    if (!loading && !hasAccess) {
      toast.error('Acesso negado. Você não tem permissão.');
      navigate('/');
    }
  }, [hasAccess, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  // Contar quantas tabs estão visíveis para ajustar o grid
  const visibleTabs = [
    permissions.dashboard,
    permissions.depositos,
    permissions.usuarios,
    permissions.bilhetes,
    permissions.configuracoes,
    permissions.logs,
    permissions.gerenciar_equipa
  ].filter(Boolean).length;

  const getGridCols = (count: number) => {
    if (count <= 3) return 'grid-cols-' + count;
    return 'grid-cols-3';
  };

  const handleNavigateToTab = (tab: string) => {
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/menu')}
            className="text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-lg font-bold text-white">Painel Admin</h1>
              {permissions.teamProfileName && (
                <p className="text-xs text-muted-foreground">{permissions.teamProfileName}</p>
              )}
            </div>
          </div>
        </div>
        <AdminNotifications onNavigate={handleNavigateToTab} />
      </div>

      {/* Quick Stats Bar */}
      <div className="mb-4">
        <QuickStats onNavigate={handleNavigateToTab} />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Horizontal scrollable tabs */}
        <div className="overflow-x-auto pb-2 mb-4">
          <TabsList className="inline-flex w-max min-w-full h-auto gap-1 p-1">
            {permissions.dashboard && (
              <TabsTrigger value="dashboard" className="flex flex-col items-center gap-0.5 py-2 px-3 text-[10px] min-w-[70px]">
                <BarChart3 className="w-4 h-4" />
                Dashboard
              </TabsTrigger>
            )}
            {permissions.depositos && (
              <TabsTrigger value="depositos" className="flex flex-col items-center gap-0.5 py-2 px-3 text-[10px] min-w-[70px]">
                <DollarSign className="w-4 h-4" />
                Depósitos
              </TabsTrigger>
            )}
            {permissions.usuarios && (
              <TabsTrigger value="usuarios" className="flex flex-col items-center gap-0.5 py-2 px-3 text-[10px] min-w-[70px]">
                <Users className="w-4 h-4" />
                Usuários
              </TabsTrigger>
            )}
            {permissions.usuarios && (
              <TabsTrigger value="afiliados" className="flex flex-col items-center gap-0.5 py-2 px-3 text-[10px] min-w-[70px]">
                <Link2 className="w-4 h-4" />
                Afiliados
              </TabsTrigger>
            )}
            {permissions.bilhetes && (
              <TabsTrigger value="bilhetes" className="flex flex-col items-center gap-0.5 py-2 px-3 text-[10px] min-w-[70px]">
                <FileText className="w-4 h-4" />
                Bilhetes
              </TabsTrigger>
            )}
            {permissions.configuracoes && (
              <TabsTrigger value="configuracoes" className="flex flex-col items-center gap-0.5 py-2 px-3 text-[10px] min-w-[70px]">
                <Settings className="w-4 h-4" />
                Config
              </TabsTrigger>
            )}
            {permissions.logs && (
              <TabsTrigger value="logs" className="flex flex-col items-center gap-0.5 py-2 px-3 text-[10px] min-w-[70px]">
                <ClipboardList className="w-4 h-4" />
                Logs
              </TabsTrigger>
            )}
            {permissions.gerenciar_equipa && (
              <TabsTrigger value="equipa" className="flex flex-col items-center gap-0.5 py-2 px-3 text-[10px] min-w-[70px]">
                <UserCog className="w-4 h-4" />
                Equipa
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {permissions.dashboard && (
          <TabsContent value="dashboard" className="mt-0">
            <FinancialDashboard />
          </TabsContent>
        )}

        {permissions.depositos && (
          <TabsContent value="depositos" className="mt-0">
            <DepositsManagement />
          </TabsContent>
        )}

        {permissions.usuarios && (
          <TabsContent value="usuarios" className="mt-0">
            <UserManagement />
          </TabsContent>
        )}

        {permissions.usuarios && (
          <TabsContent value="afiliados" className="mt-0">
            <ReferralsManagement />
          </TabsContent>
        )}

        {permissions.bilhetes && (
          <TabsContent value="bilhetes" className="mt-0">
            <TicketsManagement />
          </TabsContent>
        )}

        {permissions.configuracoes && (
          <TabsContent value="configuracoes" className="mt-0">
            <SystemSettings />
          </TabsContent>
        )}

        {permissions.logs && (
          <TabsContent value="logs" className="mt-0">
            <AdminLogs />
          </TabsContent>
        )}

        {permissions.gerenciar_equipa && (
          <TabsContent value="equipa" className="mt-0">
            <TeamManagement />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default Admin;
