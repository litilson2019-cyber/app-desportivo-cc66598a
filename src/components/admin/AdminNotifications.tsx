import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Bell,
  DollarSign,
  ArrowDownCircle,
  UserPlus,
  Clock,
  CheckCircle,
  X
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';

interface Notification {
  id: string;
  type: 'deposito' | 'levantamento' | 'usuario';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: Record<string, string | number | null>;
}

interface AdminNotificationsProps {
  onNavigate?: (tab: string) => void;
}

export const AdminNotifications = ({ onNavigate }: AdminNotificationsProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [pendingCounts, setPendingCounts] = useState({
    depositos: 0,
    levantamentos: 0
  });

  const fetchPendingCounts = useCallback(async () => {
    try {
      const { data: transacoes } = await supabase
        .from('transacoes')
        .select('id, tipo, status')
        .eq('status', 'pendente');

      const depositos = transacoes?.filter(t => t.tipo === 'deposito').length || 0;
      const levantamentos = transacoes?.filter(t => t.tipo === 'levantamento').length || 0;

      setPendingCounts({ depositos, levantamentos });
    } catch (error) {
      console.error('Error fetching pending counts:', error);
    }
  }, []);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      read: false
    };
    
    setNotifications(prev => [newNotification, ...prev.slice(0, 49)]); // Keep last 50
    setUnreadCount(prev => prev + 1);
  }, []);

  useEffect(() => {
    fetchPendingCounts();

    // Subscribe to new deposits
    const depositChannel = supabase
      .channel('admin-deposits')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transacoes',
          filter: 'tipo=eq.deposito'
        },
        async (payload) => {
          const transaction = payload.new as { id: string; user_id: string; valor: number };
          
          // Get user name
          const { data: profile } = await supabase
            .from('profiles')
            .select('nome_completo')
            .eq('id', transaction.user_id)
            .single();

          addNotification({
            type: 'deposito',
            title: 'Novo Depósito',
            message: `${profile?.nome_completo || 'Usuário'} solicitou ${Number(transaction.valor).toLocaleString()} Kz`,
            timestamp: new Date(),
            data: { transacao_id: transaction.id }
          });

          fetchPendingCounts();
        }
      )
      .subscribe();

    // Subscribe to new withdrawals
    const withdrawalChannel = supabase
      .channel('admin-withdrawals')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transacoes',
          filter: 'tipo=eq.levantamento'
        },
        async (payload) => {
          const transaction = payload.new as { id: string; user_id: string; valor: number };
          
          const { data: profile } = await supabase
            .from('profiles')
            .select('nome_completo')
            .eq('id', transaction.user_id)
            .single();

          addNotification({
            type: 'levantamento',
            title: 'Novo Levantamento',
            message: `${profile?.nome_completo || 'Usuário'} solicitou ${Number(transaction.valor).toLocaleString()} Kz`,
            timestamp: new Date(),
            data: { transacao_id: transaction.id }
          });

          fetchPendingCounts();
        }
      )
      .subscribe();

    // Subscribe to new users
    const userChannel = supabase
      .channel('admin-users')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'profiles'
        },
        (payload) => {
          const profile = payload.new as { id: string; nome_completo: string | null };

          addNotification({
            type: 'usuario',
            title: 'Novo Usuário',
            message: `${profile.nome_completo || 'Novo usuário'} registou-se na plataforma`,
            timestamp: new Date(),
            data: { user_id: profile.id }
          });
        }
      )
      .subscribe();

    // Subscribe to transaction updates (for real-time pending count)
    const updateChannel = supabase
      .channel('admin-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transacoes'
        },
        () => {
          fetchPendingCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(depositChannel);
      supabase.removeChannel(withdrawalChannel);
      supabase.removeChannel(userChannel);
      supabase.removeChannel(updateChannel);
    };
  }, [addNotification, fetchPendingCounts]);

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const clearNotification = (id: string) => {
    const notification = notifications.find(n => n.id === id);
    if (notification && !notification.read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    setIsOpen(false);
    
    if (onNavigate) {
      switch (notification.type) {
        case 'deposito':
          onNavigate('depositos');
          break;
        case 'levantamento':
          onNavigate('levantamentos');
          break;
        case 'usuario':
          onNavigate('usuarios');
          break;
      }
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'deposito':
        return <DollarSign className="w-4 h-4 text-green-400" />;
      case 'levantamento':
        return <ArrowDownCircle className="w-4 h-4 text-red-400" />;
      case 'usuario':
        return <UserPlus className="w-4 h-4 text-blue-400" />;
    }
  };

  const totalPending = pendingCounts.depositos + pendingCounts.levantamentos;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {(unreadCount > 0 || totalPending > 0) && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 text-[10px] bg-red-500 hover:bg-red-500"
            >
              {unreadCount > 0 ? unreadCount : totalPending}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0 bg-card border-border" 
        align="end"
        sideOffset={8}
      >
        <CardHeader className="pb-2 border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Notificações</CardTitle>
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs h-7"
                onClick={markAllAsRead}
              >
                Marcar todas como lidas
              </Button>
            )}
          </div>
        </CardHeader>
        
        {/* Pending counts summary */}
        {totalPending > 0 && (
          <div className="p-3 bg-amber-500/10 border-b border-border">
            <div className="flex items-center gap-2 text-xs text-amber-300">
              <Clock className="w-4 h-4" />
              <span>
                {pendingCounts.depositos > 0 && `${pendingCounts.depositos} depósito(s)`}
                {pendingCounts.depositos > 0 && pendingCounts.levantamentos > 0 && ' e '}
                {pendingCounts.levantamentos > 0 && `${pendingCounts.levantamentos} levantamento(s)`}
                {' aguardando aprovação'}
              </span>
            </div>
          </div>
        )}

        <CardContent className="p-0 max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 hover:bg-muted/50 transition-colors cursor-pointer relative group ${
                    !notification.read ? 'bg-primary/5' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{notification.title}</p>
                        {!notification.read && (
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {notification.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(notification.timestamp, { addSuffix: true, locale: pt })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearNotification(notification.id);
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>

        {notifications.length > 0 && (
          <div className="p-2 border-t border-border">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-xs"
              onClick={() => setNotifications([])}
            >
              Limpar todas
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
