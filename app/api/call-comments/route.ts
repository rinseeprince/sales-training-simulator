import { NextRequest, NextResponse } from 'next/server';
import { withOrganizationAuth } from '@/lib/organization-middleware';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Get comments for a call
 * GET /api/call-comments?callId=xxx
 */
async function getCallComments(request: any) {
  try {
    const url = new URL(request.url);
    const callId = url.searchParams.get('callId');

    if (!callId) {
      return NextResponse.json(
        { error: 'Call ID is required' },
        { status: 400 }
      );
    }

    // Verify user has access to this call within their organization
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select(`
        id,
        rep_id,
        simple_users!calls_rep_id_fkey (
          organization_id
        )
      `)
      .eq('id', callId)
      .single();

    if (callError || !call) {
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      );
    }

    // Verify access - either own call or manager/admin in same organization
    const callOrganizationId = (call as any).simple_users?.organization_id;
    const isOwnCall = call.rep_id === request.user.id;
    const isManagerInSameOrg = ['manager', 'admin'].includes(request.user.role) && 
                               request.user.organization_id === callOrganizationId;

    if (!isOwnCall && !isManagerInSameOrg) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get all comments for this call
    const { data: comments, error: commentsError } = await supabase
      .from('call_comments')
      .select(`
        id,
        content,
        created_at,
        author:simple_users!call_comments_author_id_fkey (
          name,
          email
        )
      `)
      .eq('call_id', callId)
      .order('created_at', { ascending: true });

    if (commentsError) {
      console.error('Error fetching call comments:', commentsError);
      return NextResponse.json(
        { error: 'Failed to fetch comments' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      comments: comments || []
    });

  } catch (error) {
    console.error('Error in call comments GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Add a comment to a call
 * POST /api/call-comments
 */
async function addCallComment(request: any) {
  try {
    const body = await request.json();
    const { callId, content } = body;

    if (!callId || !content?.trim()) {
      return NextResponse.json(
        { error: 'Call ID and content are required' },
        { status: 400 }
      );
    }

    // Verify the call exists and user has access to it within their organization
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select(`
        id,
        rep_id,
        simple_users!calls_rep_id_fkey (
          organization_id
        )
      `)
      .eq('id', callId)
      .single();

    if (callError || !call) {
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      );
    }

    // Verify the call belongs to the same organization
    const callOrganizationId = (call as any).simple_users?.organization_id;
    if (callOrganizationId !== request.user.organization_id) {
      return NextResponse.json(
        { error: 'Cannot access call from different organization' },
        { status: 403 }
      );
    }

    // Insert the new comment
    const { data: newComment, error: insertError } = await supabase
      .from('call_comments')
      .insert({
        call_id: callId,
        author_id: request.user.id,
        content: content.trim()
      })
      .select(`
        id,
        content,
        created_at,
        author:simple_users!call_comments_author_id_fkey (
          name,
          email
        )
      `)
      .single();

    if (insertError) {
      console.error('Error inserting call comment:', insertError);
      return NextResponse.json(
        { error: 'Failed to add comment' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      comment: newComment,
      message: 'Comment added successfully'
    });

  } catch (error) {
    console.error('Error in call comments POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Export with organization auth middleware
export const GET = withOrganizationAuth(getCallComments, {
  requiredRoles: ['user', 'manager', 'admin']
});

export const POST = withOrganizationAuth(addCallComment, {
  requiredRoles: ['manager', 'admin'],
  logAction: 'call_comment_added'
});