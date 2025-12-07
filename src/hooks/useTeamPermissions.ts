import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TeamProfile {
  id: string;
  nome: string;
  descricao: string | null;
  permissoes: {
    dashboard: boolean;
    depositos: boolean;
    usuarios: boolean;
    bilhetes: boolean;
    configuracoes: boolean;
    logs: boolean;
    gerenciar_equipa: boolean;
  };
}

export interface UserPermissions {
  dashboard: boolean;
  depositos: boolean;
  usuarios: boolean;
  bilhetes: boolean;
  configuracoes: boolean;
  logs: boolean;
  gerenciar_equipa: boolean;
  isAdmin: boolean;
  teamProfileName: string | null;
}

const defaultPermissions: UserPermissions = {
  dashboard: false,
  depositos: false,
  usuarios: false,
  bilhetes: false,
  configuracoes: false,
  logs: false,
  gerenciar_equipa: false,
  isAdmin: false,
  teamProfileName: null
};

export const useTeamPermissions = () => {
  const [permissions, setPermissions] = useState<UserPermissions>(defaultPermissions);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setPermissions(defaultPermissions);
          setHasAccess(false);
          setLoading(false);
          return;
        }

        // Buscar role e perfil de equipa do usuário
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select(`
            role,
            team_profile_id,
            team_profiles:team_profile_id (
              id,
              nome,
              permissoes
            )
          `)
          .eq('user_id', user.id)
          .maybeSingle();

        if (roleError) {
          console.error('Error checking permissions:', roleError);
          setPermissions(defaultPermissions);
          setHasAccess(false);
          setLoading(false);
          return;
        }

        if (!roleData) {
          setPermissions(defaultPermissions);
          setHasAccess(false);
          setLoading(false);
          return;
        }

        const isAdmin = roleData.role === 'admin';
        const teamProfile = roleData.team_profiles as unknown as TeamProfile | null;

        // Se é admin, tem acesso total
        if (isAdmin) {
          setPermissions({
            dashboard: true,
            depositos: true,
            usuarios: true,
            bilhetes: true,
            configuracoes: true,
            logs: true,
            gerenciar_equipa: true,
            isAdmin: true,
            teamProfileName: teamProfile?.nome || 'Admin'
          });
          setHasAccess(true);
        } else if (teamProfile?.permissoes) {
          // Usar permissões do perfil de equipa
          const perms = teamProfile.permissoes as unknown as UserPermissions;
          setPermissions({
            dashboard: perms.dashboard || false,
            depositos: perms.depositos || false,
            usuarios: perms.usuarios || false,
            bilhetes: perms.bilhetes || false,
            configuracoes: perms.configuracoes || false,
            logs: perms.logs || false,
            gerenciar_equipa: perms.gerenciar_equipa || false,
            isAdmin: false,
            teamProfileName: teamProfile.nome
          });
          setHasAccess(true);
        } else {
          setPermissions(defaultPermissions);
          setHasAccess(false);
        }
      } catch (error) {
        console.error('Error:', error);
        setPermissions(defaultPermissions);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkPermissions();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkPermissions();
    });

    return () => subscription.unsubscribe();
  }, []);

  return { permissions, loading, hasAccess };
};
