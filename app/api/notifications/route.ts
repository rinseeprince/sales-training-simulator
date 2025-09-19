import { NextRequest, NextResponse } from 'next/server'
import { supabase, errorResponse, successResponse, corsHeaders, handleCors } from '@/lib/api-utils'
import { createClient } from '@supabase/supabase-js'

// GET: Fetch notifications for a user
export async function GET(req: NextRequest) {
  try {
    const corsResponse = handleCors(req)
    if (corsResponse) return corsResponse

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    if (!userId) {
      return errorResponse('userId is required', 401)
    }

    // Create a fresh Supabase client for this request
    const freshSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let query = freshSupabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching notifications:', error)
      return errorResponse(`Database error: ${error.message}`, 500)
    }

    return NextResponse.json({
      success: true,
      notifications: data || [],
      unreadCount: data?.filter(n => !n.is_read).length || 0
    }, {
      status: 200,
      headers: corsHeaders
    })

  } catch (error) {
    console.error('Get notifications error:', error)
    return errorResponse('Internal server error', 500)
  }
}

// POST: Create a notification
export async function POST(req: NextRequest) {
  try {
    const corsResponse = handleCors(req)
    if (corsResponse) return corsResponse

    const body = await req.json()
    const { recipientId, type, title, message, entityType, entityId } = body

    if (!recipientId || !type || !title || !message) {
      return errorResponse('Missing required fields', 400)
    }

    // Create a fresh Supabase client
    const freshSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await freshSupabase
      .from('notifications')
      .insert({
        recipient_id: recipientId,
        type,
        title,
        message,
        entity_type: entityType,
        entity_id: entityId,
        is_read: false
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating notification:', error)
      return errorResponse(`Database error: ${error.message}`, 500)
    }

    return successResponse({ notification: data }, 201, corsHeaders)

  } catch (error) {
    console.error('Create notification error:', error)
    return errorResponse('Internal server error', 500)
  }
}

// PATCH: Mark notifications as read
export async function PATCH(req: NextRequest) {
  try {
    const corsResponse = handleCors(req)
    if (corsResponse) return corsResponse

    const body = await req.json()
    const { notificationIds, userId, markAllRead } = body

    // Create a fresh Supabase client
    const freshSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    if (markAllRead && userId) {
      // Mark all notifications as read for a user
      const { error } = await freshSupabase
        .from('notifications')
        .update({ is_read: true })
        .eq('recipient_id', userId)
        .eq('is_read', false)

      if (error) {
        console.error('Error marking all as read:', error)
        return errorResponse(`Database error: ${error.message}`, 500)
      }
    } else if (notificationIds && Array.isArray(notificationIds)) {
      // Mark specific notifications as read
      const { error } = await freshSupabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', notificationIds)

      if (error) {
        console.error('Error marking notifications as read:', error)
        return errorResponse(`Database error: ${error.message}`, 500)
      }
    } else {
      return errorResponse('Invalid request: provide either notificationIds or markAllRead with userId', 400)
    }

    return NextResponse.json({ success: true }, { status: 200, headers: corsHeaders })

  } catch (error) {
    console.error('Update notifications error:', error)
    return errorResponse('Internal server error', 500)
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
} 