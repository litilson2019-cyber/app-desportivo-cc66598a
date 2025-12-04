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
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { DepositsManagement } from '@/components/admin/DepositsManagement';
import { UserManagement } from '@/components/admin/UserManagement';

const Admin = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const [activeTab, setActiveTab] = useState('depositos');

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
      <div className="flex items-center gap-3 mb-6">
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
          <h1 className="text-xl font-bold text-white">Painel Administrativo</h1>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3 mb-4">
          <TabsTrigger value="depositos" className="flex items-center gap-1.5 text-xs">
            <DollarSign className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Depósitos</span>
          </TabsTrigger>
          <TabsTrigger value="usuarios" className="flex items-center gap-1.5 text-xs">
            <Users className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Usuários</span>
          </TabsTrigger>
          <TabsTrigger value="bilhetes" className="flex items-center gap-1.5 text-xs">
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Bilhetes</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="depositos" className="mt-0">
          <DepositsManagement />
        </TabsContent>

        <TabsContent value="usuarios" className="mt-0">
          <UserManagement />
        </TabsContent>

        <TabsContent value="bilhetes" className="mt-0">
          <div className="text-center text-muted-foreground py-12">
            Módulo de bilhetes em desenvolvimento...
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
