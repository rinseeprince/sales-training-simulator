import { NextRequest, NextResponse } from 'next/server';
import { authenticateWithRBAC, logActivity } from '@/lib/rbac-middleware';
import { createClient } from '@supabase/supabase-js';
import { Notification } from '@/lib/types';

// Create Supabase admin client
function createSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

// GET: Fetch notifications for the current user
export async function GET(req: NextRequest) {
  try {
    const user = await authenticateWithRBAC(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get('unread') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = createSupabaseAdmin();

    let query = supabase
      .from('notifications')
      .select(`
        *,
        recipient:simple_users!recipient_id(id, name, email)
      `)
      .eq('recipient_id', user.user.id)
      .order('triggered_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (unreadOnly) {
      query = query.is('read_at', null);
    }

    const { data: notifications, error, count } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', user.user.id)
      .is('read_at', null);

    return NextResponse.json({
      notifications: notifications || [],
      unreadCount: unreadCount || 0,
      total: count || 0,
      limit,
      offset
    });

  } catch (error) {
    console.error('Notifications API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH: Mark notification as read
export async function PATCH(req: NextRequest) {
  try {
    const user = await authenticateWithRBAC(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { notificationId, markAllRead } = body;

    const supabase = createSupabaseAdmin();

    if (markAllRead) {
      // Mark all unread notifications as read
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('recipient_id', user.user.id)
        .is('read_at', null);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
      }

      await logActivity(
        user.user.id,
        'mark_all_notifications_read',
        'notification',
        undefined,
        {},
        req
      );

      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }

    if (!notificationId) {
      return NextResponse.json({ error: 'notificationId is required' }, { status: 400 });
    }

    // Verify the notification belongs to the user
    const { data: notification } = await supabase
      .from('notifications')
      .select('recipient_id')
      .eq('id', notificationId)
      .single();

    if (!notification || notification.recipient_id !== user.user.id) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Mark single notification as read
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
    }

    await logActivity(
      user.user.id,
      'mark_notification_read',
      'notification',
      notificationId,
      {},
      req
    );

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Notifications PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Create a notification (for internal use/testing)
export async function POST(req: NextRequest) {
  try {
    const user = await authenticateWithRBAC(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers and admins can create notifications
    if (!user.isManager) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { recipientId, type, title, message, entityType, entityId, payload } = body;

    if (!recipientId || !type || !title || !message) {
      return NextResponse.json(
        { error: 'recipientId, type, title, and message are required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();

    const notificationData: Partial<Notification> = {
      recipient_id: recipientId,
      type: type,
      title,
      message,
      entity_type: entityType,
      entity_id: entityId,
      payload: payload || {},
      triggered_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('notifications')
      .insert([notificationData])
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
    }

    await logActivity(
      user.user.id,
      'create_notification',
      'notification',
      data.id,
      { recipientId, type },
      req
    );

    return NextResponse.json({ success: true, notification: data });

  } catch (error) {
    console.error('Notifications POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 