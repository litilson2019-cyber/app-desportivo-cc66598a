import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminCheck } from '@/hooks/useAdminCheck';
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
  ClipboardList
} from 'lucide-react';
import { toast } from 'sonner';
import { DepositsManagement } from '@/components/admin/DepositsManagement';
import { UserManagement } from '@/components/admin/UserManagement';
import { FinancialDashboard } from '@/components/admin/FinancialDashboard';
import { TicketsManagement } from '@/components/admin/TicketsManagement';
import { SystemSettings } from '@/components/admin/SystemSettings';
import { AdminLogs } from '@/components/admin/AdminLogs';

const Admin = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast.error('Acesso negado. Apenas administradores.');
      navigate('/');
    }
  }, [isAdmin, adminLoading, navigate]);

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
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
          <h1 className="text-lg font-bold text-white">Painel Admin</h1>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3 mb-2 h-auto">
          <TabsTrigger value="dashboard" className="flex flex-col items-center gap-0.5 py-2 text-[10px]">
            <BarChart3 className="w-4 h-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="depositos" className="flex flex-col items-center gap-0.5 py-2 text-[10px]">
            <DollarSign className="w-4 h-4" />
            Depósitos
          </TabsTrigger>
          <TabsTrigger value="usuarios" className="flex flex-col items-center gap-0.5 py-2 text-[10px]">
            <Users className="w-4 h-4" />
            Usuários
          </TabsTrigger>
        </TabsList>
        
        <TabsList className="w-full grid grid-cols-3 mb-4 h-auto">
          <TabsTrigger value="bilhetes" className="flex flex-col items-center gap-0.5 py-2 text-[10px]">
            <FileText className="w-4 h-4" />
            Bilhetes
          </TabsTrigger>
          <TabsTrigger value="configuracoes" className="flex flex-col items-center gap-0.5 py-2 text-[10px]">
            <Settings className="w-4 h-4" />
            Config
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex flex-col items-center gap-0.5 py-2 text-[10px]">
            <ClipboardList className="w-4 h-4" />
            Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-0">
          <FinancialDashboard />
        </TabsContent>

        <TabsContent value="depositos" className="mt-0">
          <DepositsManagement />
        </TabsContent>

        <TabsContent value="usuarios" className="mt-0">
          <UserManagement />
        </TabsContent>

        <TabsContent value="bilhetes" className="mt-0">
          <TicketsManagement />
        </TabsContent>

        <TabsContent value="configuracoes" className="mt-0">
          <SystemSettings />
        </TabsContent>

        <TabsContent value="logs" className="mt-0">
          <AdminLogs />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
