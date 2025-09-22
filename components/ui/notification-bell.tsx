'use client'

import { useState, useEffect } from 'react'
import { Bell, Check, CheckCheck, Users, FileText, Star, AlertCircle, MessageSquare } from 'lucide-react'
import { NotificationData } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useSupabaseAuth } from '@/components/supabase-auth-provider'
import { supabaseClient as supabase } from '@/lib/supabase-auth'
import { formatDistanceToNow } from 'date-fns'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Notification {
  id: string
  type: 'scenario_assigned' | 'assignment_completed' | 'assignment_overdue' | 'simulation_reviewed' | 'simulation_approved' | 'simulation_rejected' | 'feedback_received' | 'team_update'
  title: string
  message: string
  entity_type?: string
  entity_id?: string
  is_read: boolean
  created_at: string
}

const notificationIcons = {
  scenario_assigned: FileText,
  assignment_completed: CheckCheck,
  assignment_overdue: AlertCircle,
  simulation_reviewed: Star,
  simulation_approved: Check,
  simulation_rejected: AlertCircle,
  feedback_received: MessageSquare,
  team_update: Users,
}

const notificationColors = {
  scenario_assigned: 'text-blue-600',
  assignment_completed: 'text-green-600',
  assignment_overdue: 'text-red-600',
  simulation_reviewed: 'text-purple-600',
  simulation_approved: 'text-emerald-600',
  simulation_rejected: 'text-red-600',
  feedback_received: 'text-indigo-600',
  team_update: 'text-slate-600',
}

export function NotificationBell() {
  const router = useRouter()
  const { user } = useSupabaseAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadNotifications = async () => {
    if (!user?.id) {
      return
    }

    try {
      // First get the actual simple_users ID
      const profileResponse = await fetch(`/api/user-profile?authUserId=${user.id}`)
      const profileData = await profileResponse.json()
      
      if (!profileData.success) {
        return
      }
      
      const actualUserId = profileData.userProfile.id
      
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout')), 5000)
      })
      
      // Create the actual query promise
      const queryPromise = supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', actualUserId)
        .order('created_at', { ascending: false })
        .limit(20)
      
      // Race between query and timeout
      const { data, error } = await Promise.race([
        queryPromise,
        timeoutPromise
      ]).catch(async (timeoutError) => {
        // Fallback to API
        const response = await fetch(`/api/notifications?userId=${actualUserId}`)
        if (!response.ok) {
          throw new Error('Failed to load notifications via API')
        }
        
        const apiData = await response.json()
        return { data: apiData.notifications, error: null }
      }) as { data: NotificationData[] | null; error: Error | null }

      if (error) {
        throw error
      }

      setNotifications(data || [])
      setUnreadCount(data?.filter((n: NotificationData) => !n.is_read).length || 0)
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const subscribeToNotifications = async () => {
    if (!user?.id) return null

    try {
      // Get the actual user ID for the subscription
      const profileResponse = await fetch(`/api/user-profile?authUserId=${user.id}`)
      const profileData = await profileResponse.json()
      
      if (!profileData.success) {
        return null
      }
      
      const actualUserId = profileData.userProfile.id
      
      const channel = supabase
        .channel(`notifications:${actualUserId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `recipient_id=eq.${actualUserId}`,
          },
          (payload) => {
            const newNotification = payload.new as Notification
            setNotifications(prev => [newNotification, ...prev])
            setUnreadCount(prev => prev + 1)
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    } catch (error) {
      console.error('Error setting up subscription:', error)
      return null
    }
  }

  useEffect(() => {
    if (user?.id) {
      loadNotifications()
      
      // Set up subscription
      let unsubscribe: (() => void) | null = null
      subscribeToNotifications().then(unsub => {
        unsubscribe = unsub
      })
      
      // Reload notifications when tab becomes visible
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && user?.id) {
          loadNotifications()
        }
      }
      
      document.addEventListener('visibilitychange', handleVisibilityChange)
      
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        if (unsubscribe) {
          unsubscribe()
        }
      }
    }
  }, [user?.id])

  const markAsRead = async (notificationId: string) => {
    if (!user?.id) return

    try {
      // Use API endpoint instead of direct Supabase
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationIds: [notificationId],
          userId: user.id
        })
      })

      if (!response.ok) {
        throw new Error('Failed to mark notification as read')
      }

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    if (!user?.id) return

    try {
      // Get the actual user ID first
      const profileResponse = await fetch(`/api/user-profile?authUserId=${user.id}`)
      const profileData = await profileResponse.json()
      
      if (!profileData.success) {
        return
      }
      
      const actualUserId = profileData.userProfile.id
      
      // Use API endpoint
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          markAllRead: true,
          userId: actualUserId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read')
      }

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      await markAsRead(notification.id)
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'scenario_assigned':
        router.push('/saved-scenarios?tab=assigned')
        break
      case 'assignment_completed':
        if (notification.entity_id) {
          // Open review modal for the completed call
          router.push(`/review?callId=${notification.entity_id}`)
        }
        break
      case 'simulation_reviewed':
      case 'simulation_approved':
      case 'simulation_rejected':
      case 'feedback_received':
        if (notification.entity_id) {
          router.push(`/review?callId=${notification.entity_id}`)
        }
        break
      default:
        break
    }
    
    setIsOpen(false)
  }

  const getNotificationIcon = (type: Notification['type']) => {
    const Icon = notificationIcons[type] || Bell
    return Icon
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-full text-white hover:bg-white/10"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-red-500 text-white border-2 border-primary"
              variant="destructive"
            >
              <span className="text-xs">{unreadCount > 9 ? '9+' : unreadCount}</span>
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-80 max-h-[500px] overflow-hidden"
      >
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Mark all as read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type)
                const colorClass = notificationColors[notification.type]
                
                return (
                  <DropdownMenuItem
                    key={notification.id}
                    className={cn(
                      "flex items-start space-x-2 p-3 cursor-pointer",
                      !notification.is_read && "bg-primary/5"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className={cn("mt-0.5", colorClass)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className={cn(
                        "text-sm",
                        !notification.is_read && "font-semibold"
                      )}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                    )}
                  </DropdownMenuItem>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 