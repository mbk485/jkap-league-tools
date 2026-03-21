'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getNotifications,
  getUserNotificationReads,
  markNotificationRead,
  markAllNotificationsRead,
  DBNotification,
} from '@/lib/supabase';
import {
  Bell,
  X,
  Check,
  CheckCheck,
  ExternalLink,
  AlertCircle,
  Info,
  Megaphone,
  RefreshCw,
  Gift,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface NotificationInboxProps {
  className?: string;
}

// Get icon for notification category
function getCategoryIcon(category: string, priority: string) {
  if (priority === 'urgent') return <AlertCircle className="w-5 h-5 text-red-500" />;
  
  switch (category) {
    case 'announcement':
      return <Megaphone className="w-5 h-5 text-blue-500" />;
    case 'system':
      return <RefreshCw className="w-5 h-5 text-purple-500" />;
    case 'update':
      return <Info className="w-5 h-5 text-green-500" />;
    case 'reminder':
      return <Clock className="w-5 h-5 text-amber-500" />;
    case 'welcome':
      return <Gift className="w-5 h-5 text-pink-500" />;
    default:
      return <Bell className="w-5 h-5 text-slate-500" />;
  }
}

// Format relative time
function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// Priority badge
function PriorityBadge({ priority }: { priority: string }) {
  if (priority === 'low' || priority === 'normal') return null;
  
  const styles = {
    high: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    urgent: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${styles[priority as keyof typeof styles] || ''}`}>
      {priority.toUpperCase()}
    </span>
  );
}

export function NotificationInbox({ className = '' }: NotificationInboxProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<DBNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load notifications
  useEffect(() => {
    const loadNotifications = async () => {
      setIsLoading(true);
      try {
        const [notifs, reads] = await Promise.all([
          getNotifications(),
          user?.id ? getUserNotificationReads(user.id) : Promise.resolve(new Set<string>()),
        ]);
        setNotifications(notifs);
        setReadIds(reads);
      } catch (err) {
        console.error('Error loading notifications:', err);
      }
      setIsLoading(false);
    };

    loadNotifications();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

  const handleMarkAsRead = async (notificationId: string) => {
    if (!user?.id) return;
    
    // Optimistic update
    setReadIds(prev => new Set([...prev, notificationId]));
    await markNotificationRead(user.id, notificationId);
  };

  const handleMarkAllRead = async () => {
    if (!user?.id) return;
    
    // Optimistic update
    setReadIds(new Set(notifications.map(n => n.id)));
    await markAllNotificationsRead(user.id);
  };

  const handleNotificationClick = (notification: DBNotification) => {
    handleMarkAsRead(notification.id);
    if (notification.action_url) {
      window.open(notification.action_url, '_blank');
    }
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 flex items-center justify-center text-[10px] font-bold text-white bg-jkap-red-500 rounded-full animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-card border border-border shadow-xl z-50 animate-slide-down overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-jkap-red-500" />
              <h3 className="font-semibold text-foreground">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-jkap-red-500/20 text-jkap-red-500">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Bell className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map((notification) => {
                  const isUnread = !readIds.has(notification.id);
                  
                  return (
                    <div
                      key={notification.id}
                      className={`p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                        isUnread ? 'bg-jkap-red-500/5' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex gap-3">
                        {/* Icon */}
                        <div className="flex-shrink-0 mt-0.5">
                          {notification.icon ? (
                            <span className="text-xl">{notification.icon}</span>
                          ) : (
                            getCategoryIcon(notification.category, notification.priority)
                          )}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className={`text-sm font-medium ${isUnread ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {notification.title}
                              </h4>
                              <PriorityBadge priority={notification.priority} />
                            </div>
                            {isUnread && (
                              <span className="w-2 h-2 rounded-full bg-jkap-red-500 flex-shrink-0 mt-1.5" />
                            )}
                          </div>
                          
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {notification.content}
                          </p>
                          
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-muted-foreground">
                              {formatRelativeTime(notification.created_at)}
                            </span>
                            
                            {notification.action_url && (
                              <span className="flex items-center gap-1 text-xs text-jkap-red-500 hover:underline">
                                {notification.action_label || 'View'}
                                <ExternalLink className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Mark as read button */}
                        {isUnread && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(notification.id);
                            }}
                            className="flex-shrink-0 p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                            title="Mark as read"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-border bg-muted/30">
              <p className="text-xs text-center text-muted-foreground">
                {unreadCount === 0 ? "You're all caught up!" : `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationInbox;
