'use client'

import { useState, useEffect } from 'react'
import { Bell, Check, CheckCheck, Clock, AlertCircle, Trophy, RefreshCw } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { Notification, NotificationType } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'
import { authenticatedGet, authenticatedPatch } from '@/lib/api-client'
import { useLoadingManager } from '@/lib/loading-manager'

export function NotificationBell() {
  const { user } = useSupabaseAuth()
  const loadingManager = useLoadingManager()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const loadNotifications = async () => {
    if (!user) return
    
    try {
      await loadingManager.withLoading('load-notifications', async () => {
        setLoading(true)
        
        const response = await authenticatedGet('/api/notifications?limit=20')
        if (response.ok) {
          const data = await response.json()
          const notifications = data.notifications || []
          setNotifications(notifications)
          
          // Calculate unread count
          const unread = notifications.filter((n: Notification) => !n.read_at).length
          setUnreadCount(unread)
        }
      })
    } catch (error) {
      console.error('Failed to load notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await authenticatedPatch('/api/notifications', {
        notificationId,
        action: 'mark_read'
      })
      
      if (response.ok) {
        setNotifications(prev => {
          const updated = prev.map(n => 
            n.id === notificationId 
              ? { ...n, read_at: new Date().toISOString() }
              : n
          )
          // Update unread count
          setUnreadCount(updated.filter(n => !n.read_at).length)
          return updated
        })
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await authenticatedPatch('/api/notifications', {
        action: 'mark_all_read'
      })
      
      if (response.ok) {
        setNotifications(prev => {
          const updated = prev.map(n => ({ ...n, read_at: new Date().toISOString() }))
          setUnreadCount(0) // All marked as read
          return updated
        })
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }

  // Get icon for notification type
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'scenario_assigned':
        return <AlertCircle className="h-4 w-4 text-blue-500" />
      case 'assignment_completed':
        return <Check className="h-4 w-4 text-green-500" />
      case 'assignment_overdue':
        return <Clock className="h-4 w-4 text-red-500" />
      case 'simulation_approved':
      case 'simulation_certified':
        return <Trophy className="h-4 w-4 text-yellow-500" />
      case 'retry_requested':
        return <RefreshCw className="h-4 w-4 text-orange-500" />
      default:
        return <Bell className="h-4 w-4 text-gray-500" />
    }
  }

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.read_at) {
      await markAsRead(notification.id)
    }

    // Navigate based on entity type
    if (notification.entity_type === 'scenario_assignment' && notification.entity_id) {
      window.location.href = `/saved-scenarios?tab=assigned`
    } else if (notification.entity_type === 'simulation' && notification.entity_id) {
      window.location.href = `/review?callId=${notification.entity_id}`
    }
    
    setOpen(false)
  }

  // Fetch notifications on mount and when dropdown opens
  useEffect(() => {
    if (user) {
      loadNotifications()
      // Poll for new notifications every 30 seconds
      const interval = setInterval(loadNotifications, 30000)
      return () => clearInterval(interval)
    }
  }, [user])

  useEffect(() => {
    if (open && user) {
      loadNotifications()
    }
  }, [open])

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-white hover:text-white hover:bg-white/10">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs font-bold border-2 border-white"
              variant="destructive"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <div className="flex items-center justify-between px-4 py-2">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs"
            >
              Mark all as read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        <ScrollArea className="h-96">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No notifications
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex items-start gap-3 p-4 cursor-pointer ${
                  !notification.read_at ? 'bg-blue-50/50' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="mt-1">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-medium">{notification.title}</p>
                    {!notification.read_at && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(notification.triggered_at), { addSuffix: true })}
                  </p>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 