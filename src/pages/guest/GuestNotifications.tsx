import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { 
  Bell, 
  BellRing,
  CheckCircle2, 
  AlertCircle, 
  Receipt, 
  Megaphone, 
  Clock,
  CheckCheck
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  created_at: string;
  data: Record<string, unknown>;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'rent_reminder':
      return Receipt;
    case 'payment_verified':
      return CheckCircle2;
    case 'payment_rejected':
      return AlertCircle;
    case 'announcement':
      return Megaphone;
    default:
      return Bell;
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case 'rent_reminder':
      return 'text-yellow-500 bg-yellow-500/10';
    case 'payment_verified':
      return 'text-green-500 bg-green-500/10';
    case 'payment_rejected':
      return 'text-red-500 bg-red-500/10';
    case 'announcement':
      return 'text-blue-500 bg-blue-500/10';
    default:
      return 'text-muted-foreground bg-muted';
  }
};

export default function GuestNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isSupported, requestPermission } = usePushNotifications();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['guest-notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user?.id,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user?.id)
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-notifications'] });
      toast({ title: 'All notifications marked as read' });
    },
  });

  const handleEnableNotifications = async () => {
    const granted = await requestPermission();
    if (granted) {
      toast({ title: 'Push notifications enabled!' });
    } else {
      toast({ 
        title: 'Permission denied', 
        description: 'Please enable notifications in your device settings',
        variant: 'destructive' 
      });
    }
  };

  const filteredNotifications = notifications?.filter(n => 
    filter === 'all' ? true : !n.is_read
  ) || [];

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4 pb-24">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-24 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Bell className="h-6 w-6" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount} new
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground">Stay updated with rent reminders and alerts</p>
          </div>
          
          {isSupported && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleEnableNotifications}
              className="flex items-center gap-2"
            >
              <BellRing className="h-4 w-4" />
              Enable Push
            </Button>
          )}
        </div>

        {/* Filter & Actions */}
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All ({notifications?.length || 0})
            </Button>
            <Button
              variant={filter === 'unread' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('unread')}
            >
              Unread ({unreadCount})
            </Button>
          </div>
          
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <Card className="premium-card">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground">No notifications</h3>
              <p className="text-muted-foreground text-center mt-1">
                {filter === 'unread' 
                  ? "You're all caught up!" 
                  : "Notifications will appear here when you receive them"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type);
              const colorClass = getNotificationColor(notification.type);
              
              return (
                <Card 
                  key={notification.id}
                  className={cn(
                    "premium-card transition-all cursor-pointer hover:shadow-md",
                    !notification.is_read && "border-primary/30 bg-primary/5"
                  )}
                  onClick={() => {
                    if (!notification.is_read) {
                      markAsReadMutation.mutate(notification.id);
                    }
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className={cn("p-2.5 rounded-xl flex-shrink-0", colorClass)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className={cn(
                            "font-semibold text-foreground",
                            !notification.is_read && "font-bold"
                          )}>
                            {notification.title}
                          </h3>
                          {!notification.is_read && (
                            <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {notification.body}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </span>
                          <span className="text-muted-foreground/50">•</span>
                          <span>
                            {format(new Date(notification.created_at), 'MMM d, h:mm a')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
