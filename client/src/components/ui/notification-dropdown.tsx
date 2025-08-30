import { useState, useEffect } from 'react';
import { Bell, Heart, MessageCircle, UserPlus, ShoppingCart, X, Check, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'reply' | 'sale';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  metadata?: {
    beatTitle?: string;
    beatId?: string;
    commentId?: string;
    followerName?: string;
    amount?: number;
  };
}

interface NotificationDropdownProps {
  className?: string;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'like':
      return Heart;
    case 'comment':
      return MessageCircle;
    case 'follow':
      return UserPlus;
    case 'reply':
      return MessageCircle;
    case 'sale':
      return ShoppingCart;
    default:
      return Bell;
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case 'like':
      return 'text-red-500';
    case 'comment':
    case 'reply':
      return 'text-blue-500';
    case 'follow':
      return 'text-green-500';
    case 'sale':
      return 'text-purple-500';
    default:
      return 'text-gray-500';
  }
};

export function NotificationDropdown({ className }: NotificationDropdownProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  // Get notifications
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    enabled: !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Get unread count
  const { data: unreadData } = useQuery({
    queryKey: ['/api/notifications/unread-count'],
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  const unreadCount = unreadData?.count || 0;

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) =>
      apiRequest(`/api/notifications/${notificationId}/read`, 'POST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/notifications/mark-all-read', 'POST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
      toast({
        title: "All notifications marked as read",
      });
    },
  });

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }

    // Navigate based on notification type
    if (notification.metadata?.beatId) {
      window.location.href = `/beat/${notification.metadata.beatId}`;
    }

    setIsOpen(false);
  };

  const handleMarkAllRead = () => {
    if (unreadCount > 0) {
      markAllAsReadMutation.mutate();
    }
  };

  const unreadNotifications = notifications.filter(n => !n.isRead);

  return (
    <div className={cn('relative', className)}>
      {/* Notification Button */}
      <Button
        variant="ghost"
        size="sm"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
        data-testid="notification-button"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notification Dropdown */}
      {isOpen && (
        <Card className="absolute right-0 top-12 w-80 max-h-96 shadow-lg z-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notifications</CardTitle>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllRead}
                  disabled={markAllAsReadMutation.isPending}
                  className="text-xs"
                >
                  <CheckCheck className="h-3 w-3 mr-1" />
                  Mark all read
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <ScrollArea className="h-80">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="w-8 h-8 bg-muted rounded-full" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-3/4" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No notifications yet</p>
                  <p className="text-xs mt-1">We'll notify you when someone interacts with your content</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification) => {
                    const Icon = getNotificationIcon(notification.type);
                    const iconColor = getNotificationColor(notification.type);

                    return (
                      <div
                        key={notification.id}
                        className={cn(
                          "p-4 hover:bg-muted/50 cursor-pointer transition-colors",
                          !notification.isRead && "bg-blue-50/50 dark:bg-blue-950/20"
                        )}
                        onClick={() => handleNotificationClick(notification)}
                        data-testid={`notification-${notification.id}`}
                      >
                        <div className="flex gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                            notification.isRead ? "bg-muted" : "bg-primary/10"
                          )}>
                            <Icon className={cn("h-4 w-4", iconColor)} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {notification.title}
                                </p>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                </p>
                              </div>

                              {!notification.isRead && (
                                <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {notifications.length > 0 && (
              <>
                <Separator />
                <div className="p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-sm"
                    onClick={() => {
                      // Could navigate to a full notifications page
                      setIsOpen(false);
                    }}
                  >
                    View all notifications
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Overlay to close dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}