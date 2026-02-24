import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatKz } from '@/lib/formatKz';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Loader2, 
  Users,
  Search,
  Link2,
  Trophy,
  DollarSign,
  UserPlus
} from 'lucide-react';

interface Referral {
  id: string;
  user_id: string;
  codigo_convite: string;
  total_convidados: number;
  created_at: string;
  profiles?: {
    nome_completo: string | null;
    saldo: number | null;
  };
}

interface InvitedUser {
  id: string;
  referrer_id: string;
  invited_user_id: string;
  created_at: string;
  invited_profile?: {
    nome_completo: string | null;
  };
}

export const ReferralsManagement = () => {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [invitedUsers, setInvitedUsers] = useState<InvitedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    totalReferrers: 0,
    totalInvited: 0,
    topReferrer: '',
    topReferrerCount: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch referrals with profile info
      const { data: referralsData, error: referralsError } = await supabase
        .from('referrals')
        .select('*')
        .order('total_convidados', { ascending: false });

      if (referralsError) throw referralsError;

      // Get profile info for referrers
      const referrerIds = referralsData?.map(r => r.user_id) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, nome_completo, saldo')
        .in('id', referrerIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      const referralsWithProfiles = referralsData?.map(r => ({
        ...r,
        profiles: profilesMap.get(r.user_id) || { nome_completo: null, saldo: null }
      })) || [];

      setReferrals(referralsWithProfiles);

      // Fetch invited users
      const { data: invitedData, error: invitedError } = await supabase
        .from('invited_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (invitedError) throw invitedError;

      // Get profile info for invited users
      const invitedIds = invitedData?.map(i => i.invited_user_id) || [];
      const { data: invitedProfilesData } = await supabase
        .from('profiles')
        .select('id, nome_completo')
        .in('id', invitedIds);

      const invitedProfilesMap = new Map(invitedProfilesData?.map(p => [p.id, p]) || []);
      const invitedWithProfiles = invitedData?.map(i => ({
        ...i,
        invited_profile: invitedProfilesMap.get(i.invited_user_id) || { nome_completo: null }
      })) || [];

      setInvitedUsers(invitedWithProfiles);

      // Calculate stats
      const topReferrer = referralsWithProfiles[0];
      setStats({
        totalReferrers: referralsData?.length || 0,
        totalInvited: invitedData?.length || 0,
        topReferrer: topReferrer?.profiles?.nome_completo || 'N/A',
        topReferrerCount: topReferrer?.total_convidados || 0
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const filteredReferrals = referrals.filter(r => 
    r.profiles?.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.codigo_convite.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-AO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
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
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="p-4 flex items-center gap-3">
            <Link2 className="w-8 h-8 text-primary" />
            <div>
              <p className="text-xs text-primary/70">Afiliados</p>
              <p className="text-2xl font-bold text-primary">{stats.totalReferrers}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <UserPlus className="w-8 h-8 text-green-400" />
            <div>
              <p className="text-xs text-green-400/70">Convidados</p>
              <p className="text-2xl font-bold text-green-400">{stats.totalInvited}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-500/10 border-yellow-500/20 col-span-2">
          <CardContent className="p-4 flex items-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-400" />
            <div>
              <p className="text-xs text-yellow-400/70">Top Afiliado</p>
              <p className="text-lg font-bold text-yellow-400">
                {stats.topReferrer} ({stats.topReferrerCount} convidados)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou código..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Referrals List */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            Afiliados ({filteredReferrals.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {filteredReferrals.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum afiliado encontrado</p>
          ) : (
            filteredReferrals.map((referral) => (
              <Card key={referral.id} className="bg-background/50 border-border/30">
                <CardContent className="p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-sm">
                        {referral.profiles?.nome_completo || 'Usuário'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Desde: {formatDate(referral.created_at)}
                      </p>
                    </div>
                    <Badge className="bg-primary/20 text-primary border-primary/30">
                      <UserPlus className="w-3 h-3 mr-0.5" />
                      {referral.total_convidados} convidados
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-background/50 rounded p-2">
                      <span className="text-muted-foreground">Código:</span>
                      <span className="ml-1 font-mono font-medium">{referral.codigo_convite}</span>
                    </div>
                    <div className="bg-background/50 rounded p-2">
                      <span className="text-muted-foreground">Saldo:</span>
                      <span className="ml-1 font-medium text-primary">
                        {formatKz(referral.profiles?.saldo || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Show recent invited users */}
                  {invitedUsers.filter(i => i.referrer_id === referral.user_id).length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/30">
                      <p className="text-xs text-muted-foreground mb-1">Últimos convidados:</p>
                      <div className="flex flex-wrap gap-1">
                        {invitedUsers
                          .filter(i => i.referrer_id === referral.user_id)
                          .slice(0, 5)
                          .map((invited) => (
                            <Badge key={invited.id} variant="secondary" className="text-xs">
                              {invited.invited_profile?.nome_completo || 'Usuário'}
                            </Badge>
                          ))}
                      </div>
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
